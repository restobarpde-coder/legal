import { createHmac } from 'crypto'
import { safeCompare } from './crypto'

const GRAPH_URL = 'https://graph.facebook.com/v20.0'

// ─── Send ────────────────────────────────────────────────────

export async function sendWhatsAppText(
  to: string,
  text: string
): Promise<{ messageId: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not configured')
  }

  const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })

  if (!res.ok) {
    // Intentionally not logging the body to avoid token leakage in adjacent fields
    throw new Error(`WhatsApp API responded with status ${res.status}`)
  }

  const data = await res.json()
  const messageId = data?.messages?.[0]?.id
  if (!messageId) throw new Error('WhatsApp API returned no message ID')

  return { messageId }
}

// ─── Webhook signature verification ─────────────────────────

/**
 * Verifies the X-Hub-Signature-256 header sent by Meta.
 * Returns true when the signature matches; false otherwise.
 * Always call this before processing any webhook payload.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) {
    // Log a warning but allow in dev when secret is not set
    console.warn('[inbox/whatsapp] WHATSAPP_APP_SECRET not set – skipping signature check')
    return true
  }

  if (!signatureHeader?.startsWith('sha256=')) return false

  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
  return safeCompare(signatureHeader, expected)
}

// ─── Incoming webhook types ───────────────────────────────────

export interface WAWebhookPayload {
  object: string
  entry:  WAEntry[]
}

export interface WAEntry {
  id:      string
  changes: WAChange[]
}

export interface WAChange {
  field: string
  value: WAChangeValue
}

export interface WAChangeValue {
  messaging_product: string
  metadata: {
    display_phone_number: string
    phone_number_id:      string
  }
  contacts?: WAContact[]
  messages?: WAIncomingMessage[]
  statuses?: WAStatus[]
}

export interface WAContact {
  profile: { name: string }
  wa_id:   string
}

export interface WAIncomingMessage {
  from:      string   // sender's WhatsApp ID (phone number)
  id:        string   // Meta wamid
  timestamp: string   // Unix epoch string
  type:      'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'unknown'
  text?:     { body: string }
  image?:    { id: string; mime_type: string; sha256: string; caption?: string }
  document?: { id: string; filename: string; mime_type: string; caption?: string }
  audio?:    { id: string; mime_type: string }
  video?:    { id: string; mime_type: string; caption?: string }
}

export interface WAStatus {
  id:           string
  status:       'sent' | 'delivered' | 'read' | 'failed'
  timestamp:    string
  recipient_id: string
  errors?:      Array<{ code: number; title: string }>
}

// ─── Helpers ─────────────────────────────────────────────────

/** Extracts text content from an incoming message (best-effort). */
export function extractMessageText(msg: WAIncomingMessage): string | null {
  if (msg.type === 'text') return msg.text?.body ?? null
  if (msg.image?.caption)    return msg.image.caption
  if (msg.document?.caption) return msg.document.caption
  if (msg.video?.caption)    return msg.video.caption
  return null
}

/** Maps WA message type to our content_type enum. */
export function toContentType(
  waType: WAIncomingMessage['type']
): 'text' | 'image' | 'document' | 'audio' | 'video' {
  if (waType === 'image')    return 'image'
  if (waType === 'document') return 'document'
  if (waType === 'audio')    return 'audio'
  if (waType === 'video')    return 'video'
  return 'text'
}
