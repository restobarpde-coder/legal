import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type Params = Promise<{ id: string }>

export async function POST(_request: Request, { params }: { params: Params }) {
  const { id: conversationId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: conversation, error: conversationError } = await supabase
    .from('inbox_conversations')
    .select('id')
    .eq('id', conversationId)
    .single()

  if (conversationError || !conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const service = createServiceClient()
  const readAt = new Date().toISOString()
  const { error: messageError } = await service
    .from('inbox_messages')
    .update({ is_read: true, read_at: readAt })
    .eq('conversation_id', conversationId)
    .eq('direction', 'inbound')
    .eq('is_read', false)

  if (messageError) return NextResponse.json({ error: 'Could not mark messages as read' }, { status: 500 })

  const { error: conversationUpdateError } = await service
    .from('inbox_conversations')
    .update({ unread_count: 0 })
    .eq('id', conversationId)

  if (conversationUpdateError) return NextResponse.json({ error: 'Could not update conversation' }, { status: 500 })

  await service.from('notifications').update({ dismissed_at: readAt, read_at: readAt })
    .eq('user_id', user.id)
    .eq('related_entity_type', 'inbox_conversation')
    .eq('related_entity_id', conversationId)
    .is('dismissed_at', null)

  return NextResponse.json({ success: true, read_at: readAt })
}
