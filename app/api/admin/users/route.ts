import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/authz-server'

// ─── GET /api/admin/users ─────────────────────────────────────
// Admin only. Lists all platform users with their roles.

export async function GET() {
  const auth = await requireRole('admin')
  if (!auth.ok) return auth.response

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, is_active, created_at')
    .is('deleted_at', null)
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data ?? [] })
}
