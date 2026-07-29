import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { INBOX_ATTACHMENTS_BUCKET } from '@/lib/inbox/attachments'

export const runtime = 'nodejs'

type Params = Promise<{ id: string }>

const DOCUMENTS_BUCKET = 'documents'
const DOCUMENTS_MAX_BYTES = 100 * 1024 * 1024
const ALLOWED_DOCUMENT_TYPES = new Set(['contract', 'brief', 'evidence', 'correspondence', 'court_filing', 'other'])

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id: attachmentId } = await params

  // Cliente con la sesión del usuario: RLS restringe `inbox_attachments`,
  // `inbox_messages`, `inbox_conversations` y `cases` a lo que puede ver.
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const caseId = String(body?.caseId ?? '').trim()
  const documentType = String(body?.documentType ?? 'other').trim()
  const description = body?.description ? String(body.description).trim().slice(0, 2000) : null

  if (!caseId) return NextResponse.json({ error: 'Elegí un caso' }, { status: 400 })
  if (!ALLOWED_DOCUMENT_TYPES.has(documentType)) {
    return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 })
  }

  const { data: attachment, error: attachmentError } = await supabase
    .from('inbox_attachments')
    .select('id, storage_path, original_filename, mime_type, size_bytes, message:inbox_messages(conversation_id)')
    .eq('id', attachmentId)
    .single()
  if (attachmentError || !attachment) {
    return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })
  }
  const conversationId = (attachment.message as unknown as { conversation_id: string } | null)?.conversation_id
  if (!conversationId) {
    return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })
  }
  if (attachment.size_bytes > DOCUMENTS_MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo es demasiado grande para guardarse como documento (límite 100MB)' }, { status: 400 })
  }

  const { data: conversation } = await supabase
    .from('inbox_conversations')
    .select('linked_client_id')
    .eq('id', conversationId)
    .single()
  if (!conversation?.linked_client_id) {
    return NextResponse.json({ error: 'La conversación no está vinculada a un cliente' }, { status: 400 })
  }

  // RLS de `cases` ya limita esto a los casos donde el usuario es miembro;
  // el filtro por client_id además evita guardar en un caso de otro cliente.
  const { data: caseRow } = await supabase
    .from('cases')
    .select('id')
    .eq('id', caseId)
    .eq('client_id', conversation.linked_client_id)
    .maybeSingle()
  if (!caseRow) {
    return NextResponse.json({ error: 'El caso no pertenece al cliente vinculado a esta conversación' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data: fileBlob, error: downloadError } = await svc.storage
    .from(INBOX_ATTACHMENTS_BUCKET)
    .download(attachment.storage_path)
  if (downloadError || !fileBlob) {
    return NextResponse.json({ error: 'No se pudo leer el adjunto' }, { status: 500 })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safeFilename = attachment.original_filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const documentPath = `${user.id}/${caseId}/${timestamp}-${safeFilename}`

  const { error: uploadError } = await svc.storage
    .from(DOCUMENTS_BUCKET)
    .upload(documentPath, fileBlob, { contentType: attachment.mime_type, upsert: false })
  if (uploadError) {
    return NextResponse.json({ error: `No se pudo guardar el documento: ${uploadError.message}` }, { status: 500 })
  }

  const { data: document, error: insertError } = await svc
    .from('documents')
    .insert({
      name: attachment.original_filename,
      file_path: documentPath,
      file_size: attachment.size_bytes,
      mime_type: attachment.mime_type,
      document_type: documentType,
      description,
      case_id: caseId,
      uploaded_by: user.id,
    })
    .select('id, name, case_id')
    .single()

  if (insertError || !document) {
    await svc.storage.from(DOCUMENTS_BUCKET).remove([documentPath])
    return NextResponse.json({ error: `No se pudo registrar el documento: ${insertError?.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, document })
}
