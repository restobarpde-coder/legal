import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  verifyWebhookSignature,
  extractMessageText,
  toContentType,
  type WAWebhookPayload,
  type WAIncomingMessage,
  type WAContact,
} from '@/lib/inbox/whatsapp'

export const runtime = 'nodejs'

// ─── GET: Meta webhook verification handshake ─────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN
  if (!verifyToken) {
    console.error('[inbox/whatsapp] WHATSAPP_VERIFY_TOKEN not configured')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge ?? '', { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── POST: Incoming messages from Meta ────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Signature check (requires WHATSAPP_APP_SECRET in env)
  const sig = request.headers.get('x-hub-signature-256')
  if (!verifyWebhookSignature(rawBody, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: WAWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only handle whatsapp_business_account events
  if (payload.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ok: true })
  }

  // Process asynchronously — Meta expects a 200 within 20 s
  processPayload(payload).catch(err =>
    console.error('[inbox/whatsapp] Background processing error', err)
  )

  return NextResponse.json({ ok: true })
}

// ─── Processing ───────────────────────────────────────────────

async function processPayload(payload: WAWebhookPayload) {
  const supabase = createServiceClient()

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue

      const value = change.value

      // Index contacts by wa_id for quick lookup
      const contactMap = new Map<string, WAContact>()
      for (const c of value.contacts ?? []) {
        contactMap.set(c.wa_id, c)
      }

      // Handle incoming messages
      for (const msg of value.messages ?? []) {
        await handleIncomingMessage(supabase, msg, contactMap)
      }

      // Handle status updates (delivered / read / failed)
      for (const status of value.statuses ?? []) {
        await handleStatusUpdate(supabase, status.id, status.status)
      }
    }
  }
}

async function handleIncomingMessage(
  supabase: ReturnType<typeof createServiceClient>,
  msg:      WAIncomingMessage,
  contacts: Map<string, WAContact>
) {
  // Log the raw event for audit/replay
  await supabase.from('inbox_webhook_events').insert({
    channel:    'whatsapp',
    event_type: `message_${msg.type}`,
    raw_payload: msg as unknown as Record<string, unknown>,
    processing_status: 'received',
  })

  // Idempotency: skip if already stored
  const { data: existing } = await supabase
    .from('inbox_messages')
    .select('id')
    .eq('wa_message_id', msg.id)
    .maybeSingle()

  if (existing) {
    await markWebhookProcessed(supabase, msg.id, 'ignored')
    return
  }

  const waContactId   = msg.from
  const contactName   = contacts.get(waContactId)?.profile?.name ?? waContactId
  const textContent   = extractMessageText(msg)
  const contentType   = toContentType(msg.type)
  const sentAt        = new Date(parseInt(msg.timestamp, 10) * 1000)

  // Find or create conversation for this WhatsApp contact
  const conversationId = await resolveWhatsAppConversation(
    supabase,
    waContactId,
    contactName
  )

  // Persist message
  const { error: msgErr } = await supabase.from('inbox_messages').insert({
    conversation_id: conversationId,
    direction:       'inbound',
    content:         textContent,
    content_type:    contentType,
    sender_type:     'contact',
    sender_name:     contactName,
    wa_message_id:   msg.id,
    sent_at:         sentAt.toISOString(),
    attachments:     buildAttachments(msg),
  })

  if (msgErr) {
    await markWebhookProcessed(supabase, msg.id, 'failed', msgErr.message)
    return
  }

  // Update conversation summary
  const { data: conv } = await supabase
    .from('inbox_conversations')
    .select('unread_count')
    .eq('id', conversationId)
    .single()

  await supabase.from('inbox_conversations').update({
    last_message_at:      sentAt.toISOString(),
    last_message_preview: textContent?.slice(0, 200) ?? `[${contentType}]`,
    unread_count:         (conv?.unread_count ?? 0) + 1,
  }).eq('id', conversationId)

  await markWebhookProcessed(supabase, msg.id, 'processed')
}

async function handleStatusUpdate(
  supabase: ReturnType<typeof createServiceClient>,
  waMsgId:  string,
  status:   string
) {
  await supabase
    .from('inbox_messages')
    .update({ wa_status: status })
    .eq('wa_message_id', waMsgId)

  // Reflect on delivery attempt too
  if (status === 'failed') {
    await supabase
      .from('inbox_delivery_attempts')
      .update({ status: 'failed', last_error: `Meta status: ${status}` })
      .eq('provider_message_id', waMsgId)
      .eq('status', 'sent')
  }
}

// ─── Conversation resolution ───────────────────────────────────

async function resolveWhatsAppConversation(
  supabase:     ReturnType<typeof createServiceClient>,
  waContactId:  string,
  contactName:  string
): Promise<string> {
  // Re-use the existing open/pending conversation for this WA contact
  const { data: existing } = await supabase
    .from('inbox_conversations')
    .select('id')
    .eq('channel', 'whatsapp')
    .eq('wa_contact_id', waContactId)
    .in('status', ['open', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return existing.id

  // Try to auto-link client by phone number
  const phone = `+${waContactId}`.replace(/^\+\+/, '+')
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()

  const { data: conv, error } = await supabase
    .from('inbox_conversations')
    .insert({
      channel:          'whatsapp',
      inbox_type:       'whatsapp_shared',
      contact_name:     contactName,
      contact_phone:    phone,
      wa_contact_id:    waContactId,
      linked_client_id: client?.id ?? null,
      status:           'open',
    })
    .select('id')
    .single()

  if (error || !conv) throw new Error(`Failed to create WA conversation: ${error?.message}`)
  return conv.id
}

// ─── Helpers ──────────────────────────────────────────────────

function buildAttachments(msg: WAIncomingMessage): Record<string, unknown>[] {
  if (msg.image)    return [{ type: 'image',    mediaId: msg.image.id,    mimeType: msg.image.mime_type }]
  if (msg.document) return [{ type: 'document', mediaId: msg.document.id, mimeType: msg.document.mime_type, filename: msg.document.filename }]
  if (msg.audio)    return [{ type: 'audio',    mediaId: msg.audio.id,    mimeType: msg.audio.mime_type }]
  if (msg.video)    return [{ type: 'video',    mediaId: msg.video.id,    mimeType: msg.video.mime_type }]
  return []
}

async function markWebhookProcessed(
  supabase: ReturnType<typeof createServiceClient>,
  msgId:    string,
  status:   'processed' | 'failed' | 'ignored',
  error?:   string
) {
  await supabase
    .from('inbox_webhook_events')
    .update({
      processing_status: status,
      error_message:     error ?? null,
      processed_at:      new Date().toISOString(),
    })
    .eq('event_type', `message_${msgId}`)
    .is('processed_at', null)
}
