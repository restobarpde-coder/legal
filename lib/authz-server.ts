import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { normalizeRole, hasRole, type EffectiveRole } from '@/lib/authz'

export type AuthzResult =
  | { ok: true; user: User; role: EffectiveRole; profile: { id: string; email: string; full_name: string | null; role: string } }
  | { ok: false; response: NextResponse }

/**
 * Authorization guard for API route handlers. Returns the authenticated user
 * and their effective role, or a ready-to-return 401/403 response.
 */
export async function requireRole(min: EffectiveRole): Promise<AuthzResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single()

  const role = normalizeRole(profile?.role)
  if (!profile || !hasRole(role, min)) {
    return { ok: false, response: NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 }) }
  }

  return { ok: true, user, role: role as EffectiveRole, profile }
}

/**
 * Authorization guard for server components / pages. Redirects instead of
 * returning JSON. Returns the effective role on success.
 */
export async function requirePageRole(min: EffectiveRole): Promise<EffectiveRole> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = normalizeRole(profile?.role)
  if (!hasRole(role, min)) redirect('/dashboard')
  return role as EffectiveRole
}

/** Effective role of the current session, or null (unauthenticated / client role). */
export async function getEffectiveRole(): Promise<EffectiveRole | null> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return normalizeRole(profile?.role)
}
