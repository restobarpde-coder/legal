import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { INBOX_ATTACHMENTS_BUCKET, validateAttachment } from '@/lib/inbox/attachments'

export const runtime = 'nodejs'

type Params = Promise<{ id: string }>

const MAX_BYTES = 50 * 1024 * 1024

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id: conversationId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: conversation } = await supabase
    .from('inbox_conversations')
    .select('id, status')
    .eq('id', conversationId)
    .single()
  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  if (conversation.status === 'resolved' || conversation.status === 'spam') {
    return NextResponse.json({ error: 'La conversación no acepta nuevos archivos' }, { status: 409 })
  }

  const body = await request.json()
  const filename = String(body.filename ?? '').trim()
  const mimeType = String(body.mimeType ?? 'application/octet-stream')
  const size = Number(body.size ?? 0)
  if (!filename || !Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo debe pesar entre 1 byte y 50 MB' }, { status: 400 })
  }
  try {
    validateAttachment({ filename, mimeType, content: Buffer.alloc(1) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Archivo no permitido' }, { status: 400 })
  }

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `pending/${user.id}/${randomUUID()}-${safeFilename}`
  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient.storage
    .from(INBOX_ATTACHMENTS_BUCKET)
    .createSignedUploadUrl(storagePath)
  if (error || !data?.token) return NextResponse.json({ error: 'No fue posible preparar la subida' }, { status: 500 })

  return NextResponse.json({ path: storagePath, token: data.token, filename, mimeType, size })
}
