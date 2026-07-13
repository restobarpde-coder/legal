import { randomUUID } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'inbox-attachments'
const MAX_BYTES = 50 * 1024 * 1024
const BLOCKED_MIME_TYPES = new Set([
  'application/x-msdownload',
  'application/x-dosexec',
  'application/x-sh',
])

export type InboxAttachmentInput = {
  filename: string
  mimeType: string
  content: Buffer
  source: 'upload' | 'whatsapp' | 'email'
  providerMediaId?: string
}

export function validateAttachment(input: Pick<InboxAttachmentInput, 'filename' | 'mimeType' | 'content'>) {
  if (!input.filename.trim()) throw new Error('El archivo debe tener un nombre')
  if (input.content.byteLength === 0) throw new Error('No se puede adjuntar un archivo vacío')
  if (input.content.byteLength > MAX_BYTES) throw new Error('El archivo supera el límite de 50 MB')
  if (BLOCKED_MIME_TYPES.has(input.mimeType.toLowerCase()) || /\.(exe|bat|cmd|com|msi|sh)$/i.test(input.filename)) {
    throw new Error('Este tipo de archivo no está permitido')
  }
}

export async function storeInboxAttachment(messageId: string, input: InboxAttachmentInput) {
  validateAttachment(input)
  const supabase = createServiceClient()
  const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${messageId}/${randomUUID()}-${safeFilename}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, input.content, { contentType: input.mimeType, upsert: false })
  if (uploadError) throw new Error(`No se pudo guardar el adjunto: ${uploadError.message}`)

  const { data, error: insertError } = await supabase
    .from('inbox_attachments')
    .insert({
      message_id: messageId,
      storage_path: storagePath,
      original_filename: input.filename,
      mime_type: input.mimeType,
      size_bytes: input.content.byteLength,
      source: input.source,
      provider_media_id: input.providerMediaId ?? null,
    })
    .select('id, original_filename, mime_type, size_bytes, source')
    .single()

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath])
    throw new Error(`No se pudo registrar el adjunto: ${insertError.message}`)
  }
  return data
}

export async function getSignedInboxAttachmentUrl(storagePath: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60)
  if (error || !data?.signedUrl) throw new Error('No se pudo abrir el adjunto')
  return data.signedUrl
}
