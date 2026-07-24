import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function fingerprint(value: unknown) {
  return JSON.stringify(value ?? null)
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const conversationId = new URL(request.url).searchParams.get('conversation')

  const conversationQuery = supabase
    .from('inbox_conversations')
    .select('id, updated_at, last_message_at, unread_count', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .limit(1)

  const notificationQuery = supabase
    .from('notifications')
    .select('id, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .is('read_at', null)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  const messageQuery = conversationId
    ? supabase
        .from('inbox_messages')
        .select('id, created_at, sent_at, wa_status')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
    : Promise.resolve({ data: [], error: null })

  const [conversationResult, messageResult, notificationResult] = await Promise.all([
    conversationQuery,
    messageQuery,
    notificationQuery,
  ])

  const error = conversationResult.error || messageResult.error || notificationResult.error
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    versions: {
      conversations: fingerprint({
        count: conversationResult.count ?? 0,
        latest: conversationResult.data?.[0] ?? null,
      }),
      messages: fingerprint({
        conversationId,
        latest: messageResult.data?.[0] ?? null,
      }),
      notifications: fingerprint({
        count: notificationResult.count ?? 0,
        latest: notificationResult.data?.[0] ?? null,
      }),
    },
  })
}
