import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// ─── GET /api/inbox/conversations ────────────────────────────
// Query params:
//   channel  = 'whatsapp' | 'email' | 'all' (default: all)
//   status   = 'open' | 'pending' | 'resolved' | 'spam' | 'all' (default: open)
//   assigned = 'me' | 'unassigned' | 'all' (default: all)
//   limit    = number (default: 50)
//   offset   = number (default: 0)

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const channel  = searchParams.get('channel')  ?? 'all'
  const status   = searchParams.get('status')   ?? 'open'
  const assigned = searchParams.get('assigned') ?? 'all'
  const limit    = Math.min(parseInt(searchParams.get('limit')  ?? '50', 10), 200)
  const offset   = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0)

  let query = supabase
    .from('inbox_conversations')
    .select(`
      id, channel, inbox_type, status,
      contact_name, contact_email, contact_phone,
      email_subject, wa_contact_id,
      unread_count, last_message_at, last_message_preview,
      assigned_user_id, linked_client_id, linked_case_id,
      created_at, updated_at,
      assigned_user:users!assigned_user_id ( id, full_name, email ),
      linked_client:clients!linked_client_id ( id, name ),
      linked_case:cases!linked_case_id ( id, title ),
      email_account:inbox_email_accounts_safe ( id, email_address, account_type )
    `, { count: 'exact' })
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (channel !== 'all') {
    query = query.eq('channel', channel)
  }
  if (status !== 'all') {
    query = query.eq('status', status)
  }
  if (assigned === 'me') {
    query = query.eq('assigned_user_id', user.id)
  } else if (assigned === 'unassigned') {
    query = query.is('assigned_user_id', null)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    conversations: data ?? [],
    total:         count ?? 0,
    limit,
    offset,
  })
}
