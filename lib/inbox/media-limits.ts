// Límites reales de la API de WhatsApp Cloud (Meta) por tipo de media.
// https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media
export type MediaKind = 'image' | 'video' | 'audio' | 'document'

const MB = 1024 * 1024

export const WHATSAPP_MEDIA_LIMITS: Record<MediaKind, number> = {
  image: 5 * MB,
  video: 16 * MB,
  audio: 16 * MB,
  document: 100 * MB,
}

export function mediaKindFromMimeType(mimeType: string): MediaKind {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'document'
}

const KIND_LABEL: Record<MediaKind, string> = {
  image: 'Las imágenes',
  video: 'Los videos',
  audio: 'Los audios',
  document: 'Los documentos',
}

export function formatFileSize(bytes: number) {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`
}

/** Devuelve un mensaje de error si el archivo supera el límite de WhatsApp para su tipo; null si está OK. */
export function validateWhatsAppMediaSize(file: { type: string; size: number }): string | null {
  const kind = mediaKindFromMimeType(file.type)
  const limit = WHATSAPP_MEDIA_LIMITS[kind]
  if (file.size <= limit) return null
  return `${KIND_LABEL[kind]} no pueden superar ${formatFileSize(limit)}.`
}
