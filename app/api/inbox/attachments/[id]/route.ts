import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSignedInboxAttachmentUrl } from '@/lib/inbox/attachments'

export const runtime = 'nodejs'

type Params = Promise<{ id: string }>

// Media the browser should render in place. Anything else is offered as a
// download, so an unexpected type never renders inline on our own origin.
const INLINE_PREFIXES = ['image/', 'audio/', 'video/']
const INLINE_EXACT = new Set(['application/pdf', 'text/plain'])

function isInline(mimeType: string) {
  const normalized = mimeType.split(';')[0]!.trim().toLowerCase()
  return INLINE_PREFIXES.some((prefix) => normalized.startsWith(prefix)) || INLINE_EXACT.has(normalized)
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params

  // This select runs under the caller's session, so `inbox_attachment_select` is
  // the authorization for the bytes served below — see sql/21.
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: attachment, error } = await supabase
    .from('inbox_attachments')
    .select('storage_path, mime_type, original_filename')
    .eq('id', id)
    .single()
  if (error || !attachment) return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })

  try {
    const signedUrl = await getSignedInboxAttachmentUrl(attachment.storage_path)

    // Proxy the bytes rather than redirecting to the signed URL. The signature
    // lasts 60s while a media element keeps re-requesting byte ranges as it
    // plays and seeks, so redirecting left <audio> stalling on an expired URL.
    const range = request.headers.get('range')
    const upstream = await fetch(signedUrl, {
      headers: range ? { Range: range } : undefined,
      cache: 'no-store',
    })
    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json({ error: 'No fue posible abrir el adjunto' }, { status: 502 })
    }

    const mimeType = attachment.mime_type || 'application/octet-stream'
    const headers = new Headers()
    headers.set('Content-Type', mimeType)
    // Advertising ranges is what lets the player seek and report a duration.
    headers.set('Accept-Ranges', 'bytes')
    headers.set(
      'Content-Disposition',
      `${isInline(mimeType) ? 'inline' : 'attachment'}; filename="${attachment.original_filename.replace(/"/g, '')}"`
    )
    // Per-user authenticated content: never let a shared cache hold it.
    headers.set('Cache-Control', 'private, no-store, max-age=0')
    for (const header of ['content-length', 'content-range', 'etag', 'last-modified']) {
      const value = upstream.headers.get(header)
      if (value) headers.set(header, value)
    }

    return new NextResponse(upstream.body, { status: upstream.status, headers })
  } catch {
    return NextResponse.json({ error: 'No fue posible abrir el adjunto' }, { status: 500 })
  }
}
