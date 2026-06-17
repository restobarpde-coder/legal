import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type Params = Promise<{ id: string }>

// ─── GET /api/inbox/conversations/[id] ────────────────────────

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('inbox_conversations')
    .select(`
      id, channel, inbox_type, status,
      contact_name, contact_email, contact_phone,
      email_subject, email_thread_id, wa_contact_id, wa_conversation_id,
      unread_count, last_message_at, last_message_preview,
      assigned_user_id, linked_client_id, linked_case_id,
      created_at, updated_at,
      assigned_user:users!assigned_user_id ( id, full_name, email ),
      linked_client:clients!linked_client_id ( id, name, email, phone ),
      linked_case:cases!linked_case_id ( id, title, status ),
      email_account:inbox_email_accounts_safe ( id, email_address, display_name, account_type )
    `)
    .eq('id', id)
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  // Mark as read: reset unread count
  if ((data as any).unread_count > 0) {
    await supabase
      .from('inbox_conversations')
      .update({ unread_count: 0 })
      .eq('id', id)
  }

  return NextResponse.json({ conversation: data })
}

// ─── PATCH /api/inbox/conversations/[id] ─────────────────────
// Allowed fields: status, linked_client_id, linked_case_id

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const allowed = ['status', 'linked_client_id', 'linked_case_id'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('inbox_conversations')
    .update(updates)
    .eq('id', id)
    .select('id, status, linked_client_id, linked_case_id, updated_at')
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json({ conversation: data })
}
