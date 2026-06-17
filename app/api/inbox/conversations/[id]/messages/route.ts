import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type Params = Promise<{ id: string }>

// ─── GET /api/inbox/conversations/[id]/messages ───────────────
// Query params:
//   limit  = number (default: 100)
//   before = ISO timestamp – cursor for older messages

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id: conversationId } = await params
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the caller has access to this conversation (RLS enforces this,
  // but we check explicitly to return a clean 404 vs 403)
  const { data: conv, error: convErr } = await supabase
    .from('inbox_conversations')
    .select('id')
    .eq('id', conversationId)
    .single()

  if (convErr || !conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '100', 10), 500)
  const before = searchParams.get('before')

  let query = supabase
    .from('inbox_messages')
    .select(`
      id, direction, content, content_type,
      sender_type, sender_name, sender_user_id,
      wa_message_id, wa_status,
      email_from, email_to, email_cc, email_message_id,
      attachments, is_read, read_at,
      sent_at, created_at,
      sender_user:users!sender_user_id ( id, full_name )
    `, { count: 'exact' })
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mark inbound messages as read
  const unreadIds = (data ?? [])
    .filter(m => m.direction === 'inbound' && !m.is_read)
    .map(m => m.id)

  if (unreadIds.length > 0) {
    await supabase
      .from('inbox_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds)
  }

  return NextResponse.json({
    messages: data ?? [],
    total:    count ?? 0,
  })
}
