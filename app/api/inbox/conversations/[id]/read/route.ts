import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { markWhatsAppMessageRead } from '@/lib/inbox/whatsapp'

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

  // Grab the WhatsApp message IDs about to be marked read so we can also tell
  // Meta — the contact's checkmarks only turn blue if we call this explicitly,
  // it doesn't follow from updating our own `is_read` column.
  const { data: unreadWaMessages } = await service
    .from('inbox_messages')
    .select('wa_message_id')
    .eq('conversation_id', conversationId)
    .eq('direction', 'inbound')
    .eq('is_read', false)
    .not('wa_message_id', 'is', null)

  const readAt = new Date().toISOString()
  const { error: messageError } = await service
    .from('inbox_messages')
    .update({ is_read: true, read_at: readAt })
    .eq('conversation_id', conversationId)
    .eq('direction', 'inbound')
    .eq('is_read', false)

  if (messageError) return NextResponse.json({ error: 'Could not mark messages as read' }, { status: 500 })

  // Best-effort — a failure here must not block the internal read state we just committed.
  for (const { wa_message_id } of unreadWaMessages ?? []) {
    if (!wa_message_id) continue
    try {
      await markWhatsAppMessageRead(wa_message_id)
    } catch (err) {
      console.error(`[inbox/read] Could not mark ${wa_message_id} as read on WhatsApp`, err)
    }
  }

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
