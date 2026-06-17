import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type Params = Promise<{ id: string }>

// ─── PATCH /api/inbox/conversations/[id]/assign ───────────────
// Body: { user_id: string | null }
// null → unassign

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const { id: conversationId } = await params
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!('user_id' in body)) {
    return NextResponse.json({ error: 'user_id is required (use null to unassign)' }, { status: 400 })
  }

  const targetUserId: string | null = body.user_id ?? null

  // Validate the target user exists if provided
  if (targetUserId) {
    const { data: targetUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', targetUserId)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }
  }

  const { data, error } = await supabase
    .from('inbox_conversations')
    .update({ assigned_user_id: targetUserId })
    .eq('id', conversationId)
    .select('id, assigned_user_id, updated_at')
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json({ conversation: data })
}
