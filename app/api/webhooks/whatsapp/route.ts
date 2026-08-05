import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  verifyWebhookSignature,
  downloadWhatsAppMedia,
  extractMessageText,
  toContentType,
  sendWhatsAppText,
  isWithinBusinessHours,
  type WAWebhookPayload,
  type WAIncomingMessage,
  type WAContact,
} from '@/lib/inbox/whatsapp'
import { storeInboxAttachment } from '@/lib/inbox/attachments'
import { resolveInboxContact } from '@/lib/inbox/contacts'
import { notifyInboxMessage } from '@/lib/inbox/notifications'

export const runtime = 'nodejs'

// Sent once, automatically, the first time a WhatsApp contact ever writes to us.
const WELCOME_MESSAGE =
  'Hola, bienvenido/a al Centro de Asesoramiento. Pronto nos pondremos en contacto contigo. ¡Muchas gracias!'

// Sent every time someone writes outside business hours (Mon–Fri 9–18h, Montevideo).
const OUT_OF_HOURS_MESSAGE =
  'En este momento estamos fuera de nuestro horario de atención (lunes a viernes de 9 a 18 h). ' +
  'Te responderemos a la brevedad dentro de ese horario. ¡Gracias por escribirnos!'

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

  // Persist before answering. A serverless runtime can freeze the instance as
  // soon as the response is sent, so fire-and-forget processing was losing
  // messages: by the time the row reached Postgres — if it ever did — the
  // inbox had already missed its Realtime event. Meta allows 20 s, and the
  // slow part (media download) happens after the message row is committed.
  try {
    await processPayload(payload)
  } catch (err) {
    // A 500 makes Meta retry. Re-delivery is safe: handleIncomingMessage
    // skips messages whose wa_message_id is already stored.
    console.error('[inbox/whatsapp] Processing error', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

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
  const { data: webhookEvent } = await supabase.from('inbox_webhook_events').insert({
    channel:    'whatsapp',
    event_type: `message_${msg.type}`,
    raw_payload: msg as unknown as Record<string, unknown>,
    processing_status: 'received',
  }).select('id').single()

  // Idempotency: skip if already stored
  const { data: existing } = await supabase
    .from('inbox_messages')
    .select('id')
    .eq('wa_message_id', msg.id)
    .maybeSingle()

  if (existing) {
    await markWebhookProcessed(supabase, webhookEvent?.id, 'ignored')
    return
  }

  const waContactId   = msg.from
  const contactName   = contacts.get(waContactId)?.profile?.name ?? waContactId
  const textContent   = extractMessageText(msg)
  const contentType   = toContentType(msg.type)
  const sentAt        = new Date(parseInt(msg.timestamp, 10) * 1000)

  // Find or create conversation for this WhatsApp contact
  const { conversationId, isFirstContact } = await resolveWhatsAppConversation(
    supabase,
    waContactId,
    contactName
  )

  // Persist message
  const { data: storedMessage, error: msgErr } = await supabase.from('inbox_messages').insert({
    conversation_id: conversationId,
    direction:       'inbound',
    content:         textContent,
    content_type:    contentType,
    sender_type:     'contact',
    sender_name:     contactName,
    wa_message_id:   msg.id,
    sent_at:         sentAt.toISOString(),
    attachments:     buildAttachments(msg),
  }).select('id').single()

  if (msgErr || !storedMessage) {
    await markWebhookProcessed(supabase, webhookEvent?.id, 'failed', msgErr?.message)
    return
  }

  // First-ever message from this contact: auto-reply with a welcome message.
  // Best-effort — a failure here must never discard the already-stored inbound message.
  if (isFirstContact) {
    try {
      await sendAutoReply(supabase, conversationId, waContactId, WELCOME_MESSAGE)
    } catch (err) {
      console.error(`[inbox/whatsapp] Could not send welcome message to ${waContactId}`, err)
    }
  }

  // Outside business hours: let them know when to expect a reply. Fires on
  // every out-of-hours message, not just the first one, since a human isn't
  // going to see it until the next working slot regardless of how many times
  // they've written before.
  if (!isWithinBusinessHours()) {
    try {
      await sendAutoReply(supabase, conversationId, waContactId, OUT_OF_HOURS_MESSAGE)
    } catch (err) {
      console.error(`[inbox/whatsapp] Could not send out-of-hours message to ${waContactId}`, err)
    }
  }

  // Media URLs from Meta expire; download and retain an encrypted/private copy.
  // A media failure never discards the message itself, because its audit trail is more important.
  const media = incomingMedia(msg)
  if (media) {
    try {
      const downloaded = await downloadWhatsAppMedia(media.id)
      const attachment = await storeInboxAttachment(storedMessage.id, {
        filename: media.filename ?? downloaded.filename,
        mimeType: downloaded.mimeType,
        content: downloaded.content,
        source: 'whatsapp',
        providerMediaId: media.id,
      })
      await supabase.from('inbox_messages').update({
        attachments: [{ attachmentId: attachment.id, filename: attachment.original_filename, mimeType: attachment.mime_type, size: attachment.size_bytes }],
      }).eq('id', storedMessage.id)
    } catch {
      console.error(`[inbox/whatsapp] Could not archive media for ${msg.id}`)
    }
  }

  try {
    await notifyInboxMessage(supabase, {
      conversationId,
      messageId: storedMessage.id,
      channel: 'whatsapp',
      preview: textContent?.slice(0, 200) ?? `[${contentType}]`,
    })
  } catch (error) {
    console.error('[inbox/whatsapp] Could not create inbox notification', error)
  }

  await markWebhookProcessed(supabase, webhookEvent?.id, 'processed')
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
): Promise<{ conversationId: string; isFirstContact: boolean }> {
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

  if (existing) return { conversationId: existing.id, isFirstContact: false }

  // No open conversation — check whether this contact has ever written to us
  // before (including resolved/spam conversations) to know if this is truly
  // their first-ever message and the welcome auto-reply should fire.
  const { data: anyPrevious } = await supabase
    .from('inbox_conversations')
    .select('id')
    .eq('channel', 'whatsapp')
    .eq('wa_contact_id', waContactId)
    .limit(1)
    .maybeSingle()

  const isFirstContact = !anyPrevious

  // Try to auto-link client by phone number
  const phone = `+${waContactId}`.replace(/^\+\+/, '+')
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()

  const inboxContactId = await resolveInboxContact(supabase, {
    name: contactName,
    phone,
    linkedClientId: client?.id ?? null,
  })

  const { data: conv, error } = await supabase
    .from('inbox_conversations')
    .insert({
      channel:          'whatsapp',
      inbox_type:       'whatsapp_shared',
      contact_name:     contactName,
      contact_phone:    phone,
      wa_contact_id:    waContactId,
      inbox_contact_id: inboxContactId,
      linked_client_id: client?.id ?? null,
      status:           'open',
    })
    .select('id')
    .single()

  if (error || !conv) throw new Error(`Failed to create WA conversation: ${error?.message}`)
  return { conversationId: conv.id, isFirstContact }
}

async function sendAutoReply(
  supabase:        ReturnType<typeof createServiceClient>,
  conversationId:  string,
  waContactId:     string,
  text:            string
) {
  const { messageId } = await sendWhatsAppText(waContactId, text)

  await supabase.from('inbox_messages').insert({
    conversation_id: conversationId,
    direction:       'outbound',
    content:         text,
    content_type:    'text',
    sender_type:     'user',
    sender_name:     'Sistema',
    wa_message_id:   messageId,
    wa_status:       'sent',
    sent_at:         new Date().toISOString(),
  })
}

// ─── Helpers ──────────────────────────────────────────────────

function buildAttachments(msg: WAIncomingMessage): Record<string, unknown>[] {
  if (msg.image)    return [{ type: 'image',    mediaId: msg.image.id,    mimeType: msg.image.mime_type }]
  if (msg.document) return [{ type: 'document', mediaId: msg.document.id, mimeType: msg.document.mime_type, filename: msg.document.filename }]
  if (msg.audio)    return [{ type: 'audio',    mediaId: msg.audio.id,    mimeType: msg.audio.mime_type }]
  if (msg.video)    return [{ type: 'video',    mediaId: msg.video.id,    mimeType: msg.video.mime_type }]
  return []
}

function incomingMedia(msg: WAIncomingMessage): { id: string; filename?: string } | null {
  if (msg.image) return { id: msg.image.id, filename: `${msg.image.id}.jpg` }
  if (msg.document) return { id: msg.document.id, filename: msg.document.filename }
  if (msg.audio) return { id: msg.audio.id, filename: `${msg.audio.id}.audio` }
  if (msg.video) return { id: msg.video.id, filename: `${msg.video.id}.mp4` }
  return null
}

async function markWebhookProcessed(
  supabase: ReturnType<typeof createServiceClient>,
  webhookEventId: string | undefined,
  status:   'processed' | 'failed' | 'ignored',
  error?:   string
) {
  if (!webhookEventId) return
  await supabase
    .from('inbox_webhook_events')
    .update({
      processing_status: status,
      error_message:     error ?? null,
      processed_at:      new Date().toISOString(),
    })
    .eq('id', webhookEventId)
}
