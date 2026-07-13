import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/authz-server'
import { normalizeRole } from '@/lib/authz'

type Params = Promise<{ id: string }>

const ASSIGNABLE_ROLES = ['admin', 'lawyer', 'assistant'] as const

// ─── PATCH /api/admin/users/[id] ─────────────────────────────
// Admin only. Body: { role: 'admin' | 'lawyer' | 'assistant' }
// The DB trigger (enforce_role_change) independently blocks
// non-admin role changes; this route adds validation and the
// last-admin guard.

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const auth = await requireRole('admin')
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await request.json()
  const nextRole = body?.role as string | undefined

  if (!nextRole || !ASSIGNABLE_ROLES.includes(nextRole as typeof ASSIGNABLE_ROLES[number])) {
    return NextResponse.json({ error: 'Rol inválido. Valores permitidos: admin, lawyer, assistant.' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: target, error: targetErr } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', id)
    .single()

  if (targetErr || !target) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Never leave the platform without an admin.
  if (normalizeRole(target.role) === 'admin' && nextRole !== 'admin') {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .in('role', ['admin', 'super_admin'])
      .is('deleted_at', null)

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'No se puede quitar el rol al único administrador.' }, { status: 409 })
    }
  }

  const { data, error } = await supabase
    .from('users')
    .update({ role: nextRole })
    .eq('id', id)
    .select('id, email, full_name, role')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data })
}
