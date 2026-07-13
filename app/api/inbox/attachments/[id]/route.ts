import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSignedInboxAttachmentUrl } from '@/lib/inbox/attachments'

type Params = Promise<{ id: string }>

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: attachment, error } = await supabase
    .from('inbox_attachments')
    .select('storage_path')
    .eq('id', id)
    .single()
  if (error || !attachment) return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 })

  try {
    return NextResponse.redirect(await getSignedInboxAttachmentUrl(attachment.storage_path))
  } catch {
    return NextResponse.json({ error: 'No fue posible abrir el adjunto' }, { status: 500 })
  }
}
