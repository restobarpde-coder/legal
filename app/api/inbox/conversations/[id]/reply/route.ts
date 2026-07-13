import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWhatsAppMedia, sendWhatsAppText, uploadWhatsAppMedia, type WhatsAppMediaType } from '@/lib/inbox/whatsapp'
import { sendEmail, replySubject } from '@/lib/inbox/smtp'
import { decrypt } from '@/lib/inbox/crypto'
import { storeInboxAttachment } from '@/lib/inbox/attachments'

export const runtime = 'nodejs'

type Params = Promise<{ id: string }>

// ─── POST /api/inbox/conversations/[id]/reply ─────────────────
// JSON body: { content: string }
// Or multipart body: content + files[]

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id: conversationId } = await params

  // Authenticate with user client (enforces RLS on conversation access)
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await readReplyPayload(request)
  if (!payload.content && payload.files.length === 0) {
    return NextResponse.json({ error: 'Escribí un mensaje o adjuntá un archivo' }, { status: 400 })
  }
  const { content } = payload

  // Fetch conversation — RLS ensures user has access
  const { data: conv, error: convErr } = await supabase
    .from('inbox_conversations')
    .select('id, channel, status, wa_contact_id, email_subject, email_thread_id, email_account_id, contact_email')
    .eq('id', conversationId)
    .single()

  if (convErr || !conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  if (conv.status === 'resolved' || conv.status === 'spam') {
    return NextResponse.json({ error: 'Cannot reply to a resolved or spam conversation' }, { status: 409 })
  }

  // Get sender display name
  const { data: sender } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', user.id)
    .single()
  const senderName = sender?.full_name ?? sender?.email ?? 'Equipo'

  // Service client for writing messages (bypasses INSERT RLS restriction for outbound)
  const svc = createServiceClient()

  // ── WhatsApp reply ──────────────────────────────────────────
  if (conv.channel === 'whatsapp') {
    if (!conv.wa_contact_id) {
      return NextResponse.json({ error: 'No WhatsApp contact ID on conversation' }, { status: 422 })
    }

    // Persist message optimistically before sending to Meta
    const { data: msg, error: insertErr } = await svc.from('inbox_messages').insert({
      conversation_id: conversationId,
      direction:       'outbound',
      content,
      content_type:    'text',
      sender_type:     'user',
      sender_user_id:  user.id,
      sender_name:     senderName,
      wa_status:       'pending',
      sent_at:         new Date().toISOString(),
    }).select('id').single()

    if (insertErr || !msg) {
      return NextResponse.json({ error: 'Failed to persist message' }, { status: 500 })
    }

    let attachments: Awaited<ReturnType<typeof saveReplyAttachments>>
    try {
      attachments = await saveReplyAttachments(msg.id, payload.files)
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'No fue posible guardar los adjuntos' }, { status: 400 })
    }

    // Create delivery attempt record
    await svc.from('inbox_delivery_attempts').insert({
      message_id:     msg.id,
      status:         'pending',
      attempt_number: 1,
    })

    try {
      const providerMessageIds: string[] = []
      if (content) {
        const { messageId } = await sendWhatsAppText(conv.wa_contact_id, content)
        providerMessageIds.push(messageId)
      }
      for (const attachment of attachments) {
        const type = toWhatsAppMediaType(attachment.mime_type)
        const { mediaId } = await uploadWhatsAppMedia({
          content: attachment.content,
          mimeType: attachment.mime_type,
          filename: attachment.original_filename,
        })
        const { messageId } = await sendWhatsAppMedia({
          to: conv.wa_contact_id,
          mediaId,
          type,
          filename: attachment.original_filename,
        })
        providerMessageIds.push(messageId)
      }
      const waMsgId = providerMessageIds[0]

      // Mark sent
      await svc.from('inbox_messages').update({ wa_message_id: waMsgId, wa_status: 'sent' }).eq('id', msg.id)
      await svc.from('inbox_delivery_attempts').update({ status: 'sent', provider_message_id: waMsgId }).eq('message_id', msg.id)

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      await svc.from('inbox_messages').update({ wa_status: 'failed' }).eq('id', msg.id)
      await svc.from('inbox_delivery_attempts').update({ status: 'failed', last_error: errMsg }).eq('message_id', msg.id)
      return NextResponse.json({ error: 'WhatsApp send failed', detail: errMsg }, { status: 502 })
    }

    await updateConversationSummary(svc, conversationId, content || `[${attachments.length} archivo${attachments.length === 1 ? '' : 's'}]`)
    return NextResponse.json({ success: true, message_id: msg.id })
  }

  // ── Email reply ─────────────────────────────────────────────
  if (conv.channel === 'email') {
    if (!conv.email_account_id) {
      return NextResponse.json({ error: 'No email account linked to conversation' }, { status: 422 })
    }
    if (!conv.contact_email) {
      return NextResponse.json({ error: 'No recipient email on conversation' }, { status: 422 })
    }

    // Fetch account credentials via service role (never exposed to client)
    const { data: account, error: acctErr } = await svc
      .from('inbox_email_accounts')
      .select('*')
      .eq('id', conv.email_account_id)
      .single()

    if (acctErr || !account) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 500 })
    }

    // Build References chain (fetch last message's email_message_id)
    const { data: lastMsg } = await svc
      .from('inbox_messages')
      .select('email_message_id')
      .eq('conversation_id', conversationId)
      .not('email_message_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const inReplyTo = lastMsg?.email_message_id ?? conv.email_thread_id ?? undefined
    const references = [conv.email_thread_id, lastMsg?.email_message_id]
      .filter((s): s is string => !!s && s !== conv.email_thread_id || s === conv.email_thread_id)

    // Persist message before sending
    const { data: msg, error: insertErr } = await svc.from('inbox_messages').insert({
      conversation_id:  conversationId,
      direction:        'outbound',
      content,
      content_type:     'text',
      sender_type:      'user',
      sender_user_id:   user.id,
      sender_name:      senderName,
      email_account_id: conv.email_account_id,
      email_to:         [conv.contact_email],
      sent_at:          new Date().toISOString(),
    }).select('id').single()

    if (insertErr || !msg) {
      return NextResponse.json({ error: 'Failed to persist message' }, { status: 500 })
    }

    let attachments: Awaited<ReturnType<typeof saveReplyAttachments>>
    try {
      attachments = await saveReplyAttachments(msg.id, payload.files)
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'No fue posible guardar los adjuntos' }, { status: 400 })
    }

    await svc.from('inbox_delivery_attempts').insert({
      message_id:     msg.id,
      status:         'pending',
      attempt_number: 1,
    })

    try {
      const decryptedPassword = decrypt(account.encrypted_password)
      const { messageId: smtpMsgId } = await sendEmail({
        account: {
          smtp_host:     account.smtp_host,
          smtp_port:     account.smtp_port,
          smtp_tls:      account.smtp_tls,
          username:      account.username,
          email_address: account.email_address,
          display_name:  account.display_name,
        },
        decryptedPassword,
        to:         [conv.contact_email],
        subject:    replySubject(conv.email_subject),
        text:       content,
        inReplyTo,
        references: references.filter(Boolean) as string[],
        attachments: attachments.map(attachment => ({
          filename: attachment.original_filename,
          content: attachment.content,
          contentType: attachment.mime_type,
        })),
      })

      await svc.from('inbox_messages').update({ email_message_id: smtpMsgId }).eq('id', msg.id)
      await svc.from('inbox_delivery_attempts').update({ status: 'sent', provider_message_id: smtpMsgId }).eq('message_id', msg.id)

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      // Do not include errMsg in logs directly (may contain auth info from nodemailer)
      console.error(`[inbox/reply] SMTP send failed for message ${msg.id}`)
      await svc.from('inbox_delivery_attempts').update({ status: 'failed', last_error: errMsg }).eq('message_id', msg.id)
      return NextResponse.json({ error: 'Email send failed' }, { status: 502 })
    }

    await updateConversationSummary(svc, conversationId, content || `[${attachments.length} archivo${attachments.length === 1 ? '' : 's'}]`)
    return NextResponse.json({ success: true, message_id: msg.id })
  }

  return NextResponse.json({ error: `Unknown channel: ${conv.channel}` }, { status: 422 })
}

type UploadedReplyFile = File

async function readReplyPayload(request: NextRequest): Promise<{ content: string; files: UploadedReplyFile[] }> {
  const requestType = request.headers.get('content-type') ?? ''
  if (requestType.includes('multipart/form-data')) {
    const form = await request.formData()
    const files = form.getAll('files').filter((value): value is UploadedReplyFile => value instanceof File)
    return { content: String(form.get('content') ?? '').trim(), files }
  }
  const body = await request.json()
  return { content: String(body?.content ?? '').trim(), files: [] }
}

async function saveReplyAttachments(messageId: string, files: UploadedReplyFile[]) {
  return Promise.all(files.map(async file => {
    const content = Buffer.from(await file.arrayBuffer())
    const saved = await storeInboxAttachment(messageId, {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      content,
      source: 'upload',
    })
    return { ...saved, content }
  }))
}

function toWhatsAppMediaType(mimeType: string): WhatsAppMediaType {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  return 'document'
}

// ─── Helper ───────────────────────────────────────────────────

async function updateConversationSummary(
  svc:            ReturnType<typeof createServiceClient>,
  conversationId: string,
  content:        string
) {
  await svc.from('inbox_conversations').update({
    last_message_at:      new Date().toISOString(),
    last_message_preview: content.slice(0, 200),
  }).eq('id', conversationId)
}
