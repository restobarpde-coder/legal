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

export async function sendWhatsAppTemplate(params: {
  to: string
  name: string
  languageCode: string
}): Promise<{ messageId: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) throw new Error('WhatsApp API is not configured')

  const response = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'template',
      template: { name: params.name, language: { code: params.languageCode } },
    }),
  })
  if (!response.ok) throw new Error(`WhatsApp template send responded with status ${response.status}`)
  const data = await response.json()
  const messageId = data?.messages?.[0]?.id
  if (!messageId) throw new Error('WhatsApp API returned no message ID')
  return { messageId }
}

export type WhatsAppMediaType = 'image' | 'document' | 'audio' | 'video'

export async function uploadWhatsAppMedia(params: {
  content: Buffer
  mimeType: string
  filename: string
}): Promise<{ mediaId: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) throw new Error('WhatsApp API is not configured')

  const form = new FormData()
  form.set('messaging_product', 'whatsapp')
  const bytes = new Uint8Array(params.content.byteLength)
  bytes.set(params.content)
  form.set('file', new Blob([bytes], { type: params.mimeType }), params.filename)

  const response = await fetch(`${GRAPH_URL}/${phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  if (!response.ok) throw new Error(`WhatsApp media upload responded with status ${response.status}`)
  const data = await response.json()
  if (!data?.id) throw new Error('WhatsApp API returned no media ID')
  return { mediaId: data.id }
}

export async function sendWhatsAppMedia(params: {
  to: string
  mediaId: string
  type: WhatsAppMediaType
  filename?: string
  caption?: string
}): Promise<{ messageId: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) throw new Error('WhatsApp API is not configured')

  const media = { id: params.mediaId, ...(params.caption ? { caption: params.caption } : {}), ...(params.type === 'document' && params.filename ? { filename: params.filename } : {}) }
  const response = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: params.to, type: params.type, [params.type]: media }),
  })
  if (!response.ok) throw new Error(`WhatsApp media send responded with status ${response.status}`)
  const data = await response.json()
  const messageId = data?.messages?.[0]?.id
  if (!messageId) throw new Error('WhatsApp API returned no message ID')
  return { messageId }
}

export async function downloadWhatsAppMedia(mediaId: string): Promise<{
  content: Buffer
  mimeType: string
  filename: string
}> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!accessToken) throw new Error('WhatsApp API is not configured')
  const infoResponse = await fetch(`${GRAPH_URL}/${mediaId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!infoResponse.ok) throw new Error(`WhatsApp media lookup responded with status ${infoResponse.status}`)
  const info = await infoResponse.json()
  if (!info?.url) throw new Error('WhatsApp API returned no media URL')
  const contentResponse = await fetch(info.url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!contentResponse.ok) throw new Error(`WhatsApp media download responded with status ${contentResponse.status}`)
  const mimeType = contentResponse.headers.get('content-type') ?? info.mime_type ?? 'application/octet-stream'
  return { content: Buffer.from(await contentResponse.arrayBuffer()), mimeType, filename: mediaId }
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
    // Development convenience only. Production must never accept unsigned webhooks.
    console.warn('[inbox/whatsapp] WHATSAPP_APP_SECRET not set – skipping signature check')
    return process.env.NODE_ENV !== 'production'
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
