import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveInboxContact } from '@/lib/inbox/contacts'
import { sendEmail } from '@/lib/inbox/smtp'
import { decrypt } from '@/lib/inbox/crypto'
import { sendWhatsAppTemplate } from '@/lib/inbox/whatsapp'

export const runtime = 'nodejs'

// ─── GET /api/inbox/conversations ────────────────────────────
// Query params:
//   channel  = 'whatsapp' | 'email' | 'all' (default: all)
//   status   = 'open' | 'pending' | 'resolved' | 'spam' | 'all' (default: open)
//   assigned = 'me' | 'unassigned' | 'all' (default: all)
//   limit    = number (default: 50)
//   offset   = number (default: 0)

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const channel  = searchParams.get('channel')  ?? 'all'
  const status   = searchParams.get('status')   ?? 'open'
  const assigned = searchParams.get('assigned') ?? 'all'
  const limit    = Math.min(parseInt(searchParams.get('limit')  ?? '50', 10), 200)
  const offset   = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0)

  let query = supabase
    .from('inbox_conversations')
    .select(`
      id, channel, inbox_type, status,
      contact_name, contact_email, contact_phone,
      email_subject, wa_contact_id,
      unread_count, last_message_at, last_message_preview,
      assigned_user_id, linked_client_id, linked_case_id,
      created_at, updated_at,
      assigned_user:users!assigned_user_id ( id, full_name, email ),
      linked_client:clients!linked_client_id ( id, name ),
      linked_case:cases!linked_case_id ( id, title ),
      email_account:inbox_email_accounts_safe ( id, email_address, account_type )
    `, { count: 'exact' })
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (channel !== 'all') {
    query = query.eq('channel', channel)
  }
  if (status !== 'all') {
    query = query.eq('status', status)
  }
  if (assigned === 'me') {
    query = query.eq('assigned_user_id', user.id)
  } else if (assigned === 'unassigned') {
    query = query.is('assigned_user_id', null)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    conversations: data ?? [],
    total:         count ?? 0,
    limit,
    offset,
  })
}

// ─── POST /api/inbox/conversations ───────────────────────────
// Creates an outbound email or a WhatsApp conversation initiated by a template.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const channel = body.channel as 'email' | 'whatsapp'
  if (channel !== 'email' && channel !== 'whatsapp') return NextResponse.json({ error: 'Canal inválido' }, { status: 400 })

  const contactName = String(body.contact_name ?? '').trim() || null
  const contactEmail = String(body.contact_email ?? '').trim().toLowerCase() || null
  const contactPhone = String(body.contact_phone ?? '').replace(/\s+/g, '') || null
  const linkedClientId = body.linked_client_id || null
  if (channel === 'email' && !contactEmail) return NextResponse.json({ error: 'El email del destinatario es obligatorio' }, { status: 400 })
  if (channel === 'whatsapp' && !contactPhone) return NextResponse.json({ error: 'El número de WhatsApp es obligatorio' }, { status: 400 })

  const svc = createServiceClient()
  const { data: sender } = await supabase.from('users').select('full_name, email').eq('id', user.id).single()
  const senderName = sender?.full_name ?? sender?.email ?? 'Equipo'
  const inboxContactId = await resolveInboxContact(svc, { name: contactName, email: contactEmail, phone: contactPhone, linkedClientId })

  if (channel === 'whatsapp') {
    const phone = contactPhone!
    const templateId = String(body.template_id ?? '')
    if (!templateId) return NextResponse.json({ error: 'Elegí una plantilla aprobada de WhatsApp' }, { status: 400 })
    const { data: template } = await supabase.from('inbox_whatsapp_templates').select('id, name, language_code').eq('id', templateId).eq('is_active', true).single()
    if (!template) return NextResponse.json({ error: 'Plantilla no disponible' }, { status: 404 })

    const { data: conversation, error } = await svc.from('inbox_conversations').insert({
      channel: 'whatsapp', inbox_type: 'whatsapp_shared', contact_name: contactName || contactPhone,
      contact_phone: phone, wa_contact_id: phone.replace(/^\+/, ''), inbox_contact_id: inboxContactId,
      linked_client_id: linkedClientId, assigned_user_id: user.id, status: 'open',
      last_message_at: new Date().toISOString(), last_message_preview: `[Plantilla: ${template.name}]`,
    }).select('id').single()
    if (error || !conversation) return NextResponse.json({ error: error?.message ?? 'No fue posible crear la conversación' }, { status: 500 })

    try {
      const { messageId } = await sendWhatsAppTemplate({ to: phone.replace(/^\+/, ''), name: template.name, languageCode: template.language_code })
      await svc.from('inbox_messages').insert({
        conversation_id: conversation.id, direction: 'outbound', content: `[Plantilla: ${template.name}]`, content_type: 'text',
        sender_type: 'user', sender_user_id: user.id, sender_name: senderName, wa_message_id: messageId, wa_status: 'sent', sent_at: new Date().toISOString(),
      })
      return NextResponse.json({ conversation_id: conversation.id }, { status: 201 })
    } catch (err) {
      await svc.from('inbox_conversations').delete().eq('id', conversation.id)
      return NextResponse.json({ error: err instanceof Error ? err.message : 'No fue posible enviar la plantilla' }, { status: 502 })
    }
  }

  const emailAccountId = String(body.email_account_id ?? '')
  const recipientEmail = contactEmail!
  const subject = String(body.subject ?? '').trim()
  const content = String(body.content ?? '').trim()
  if (!emailAccountId || !subject || !content) return NextResponse.json({ error: 'Cuenta, asunto y mensaje son obligatorios' }, { status: 400 })
  const { data: accessibleAccount } = await supabase.from('inbox_email_accounts_safe').select('id').eq('id', emailAccountId).single()
  if (!accessibleAccount) return NextResponse.json({ error: 'No podés usar esta cuenta de correo' }, { status: 403 })
  const { data: account } = await svc.from('inbox_email_accounts').select('*').eq('id', emailAccountId).single()
  if (!account) return NextResponse.json({ error: 'Cuenta de correo no encontrada' }, { status: 404 })

  const { data: conversation, error } = await svc.from('inbox_conversations').insert({
    channel: 'email', inbox_type: account.account_type === 'personal' ? 'email_personal' : 'email_shared', email_account_id: account.id,
    contact_name: contactName || recipientEmail, contact_email: recipientEmail, inbox_contact_id: inboxContactId, linked_client_id: linkedClientId,
    assigned_user_id: user.id, email_subject: subject, status: 'open', last_message_at: new Date().toISOString(), last_message_preview: content.slice(0, 200),
  }).select('id').single()
  if (error || !conversation) return NextResponse.json({ error: error?.message ?? 'No fue posible crear la conversación' }, { status: 500 })

  const { data: outboundMessage, error: messageError } = await svc.from('inbox_messages').insert({
    conversation_id: conversation.id, direction: 'outbound', content, content_type: 'text', sender_type: 'user', sender_user_id: user.id,
    sender_name: senderName, email_account_id: account.id, email_from: account.email_address, email_to: [recipientEmail], sent_at: new Date().toISOString(),
  }).select('id').single()
  if (messageError || !outboundMessage) {
    await svc.from('inbox_conversations').delete().eq('id', conversation.id)
    return NextResponse.json({ error: 'No fue posible registrar el email en la bandeja' }, { status: 500 })
  }
  await svc.from('inbox_delivery_attempts').insert({ message_id: outboundMessage.id, status: 'pending', attempt_number: 1 })

  try {
    const { messageId } = await sendEmail({
      account, decryptedPassword: decrypt(account.encrypted_password), to: [recipientEmail], subject, text: content,
    })
    await svc.from('inbox_messages').update({ email_message_id: messageId }).eq('id', outboundMessage.id)
    await svc.from('inbox_delivery_attempts').update({ status: 'sent', provider_message_id: messageId }).eq('message_id', outboundMessage.id)
    return NextResponse.json({ conversation_id: conversation.id }, { status: 201 })
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : 'SMTP_ERROR'
    console.error(`[inbox/conversations] SMTP send failed (${code})`)
    await svc.from('inbox_delivery_attempts').update({ status: 'failed', last_error: code }).eq('message_id', outboundMessage.id)
    const error = code === 'EAUTH' || code === 'EAUTHE'
      ? 'Hostinger rechazó las credenciales SMTP.'
      : code === 'ETIMEDOUT' || code === 'ESOCKET'
        ? 'No se pudo conectar al servidor SMTP. Revisá host, puerto y TLS.'
        : 'No fue posible enviar el email. Revisá la configuración SMTP.'
    return NextResponse.json({ error, code, conversation_id: conversation.id }, { status: 502 })
  }
}
