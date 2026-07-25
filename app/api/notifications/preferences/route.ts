import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isNotificationTypeId, mergePreferences } from '@/lib/notifications/catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('type, enabled, push')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'No fue posible cargar las preferencias' }, { status: 500 })
  }

  return NextResponse.json({ preferences: mergePreferences(data ?? []) })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const incoming = (body as { preferences?: unknown })?.preferences
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return NextResponse.json({ error: 'preferences debe ser un arreglo no vacío' }, { status: 400 })
  }

  const rows = []
  for (const item of incoming) {
    const type = (item as { type?: unknown })?.type
    if (typeof type !== 'string' || !isNotificationTypeId(type)) {
      return NextResponse.json({ error: `Tipo de notificación desconocido: ${String(type)}` }, { status: 400 })
    }
    rows.push({
      user_id: user.id,
      type,
      enabled: (item as { enabled?: unknown }).enabled !== false,
      push: (item as { push?: unknown }).push !== false,
      updated_at: new Date().toISOString(),
    })
  }

  // RLS ya limita la escritura a las filas propias; el user_id explícito es lo
  // que hace que el upsert encuentre la fila existente por (user_id, type).
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(rows, { onConflict: 'user_id,type' })

  if (error) {
    return NextResponse.json({ error: 'No fue posible guardar las preferencias' }, { status: 500 })
  }

  const { data, error: reloadError } = await supabase
    .from('notification_preferences')
    .select('type, enabled, push')
    .eq('user_id', user.id)

  if (reloadError) {
    return NextResponse.json({ error: 'Se guardó, pero no fue posible releer las preferencias' }, { status: 500 })
  }

  return NextResponse.json({ preferences: mergePreferences(data ?? []) })
}
