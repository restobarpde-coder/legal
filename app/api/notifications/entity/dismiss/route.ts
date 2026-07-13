import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    const body = await request.json()
    const entityType = String(body.entity_type ?? '').trim()
    const entityId = String(body.entity_id ?? '').trim()

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entity_type y entity_id son obligatorios' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: now, dismissed_at: now })
      .eq('user_id', user.id)
      .eq('related_entity_type', entityType)
      .eq('related_entity_id', entityId)
      .is('dismissed_at', null)

    if (error) return NextResponse.json({ error: 'No fue posible actualizar la notificación' }, { status: 500 })

    if (entityType === 'inbox_conversation') {
      const { error: messageNotificationError } = await supabase
        .from('notifications')
        .update({ read_at: now, dismissed_at: now })
        .eq('user_id', user.id)
        .eq('related_entity_type', 'inbox_message')
        .filter('metadata->>conversation_id', 'eq', entityId)
        .is('dismissed_at', null)
      if (messageNotificationError) return NextResponse.json({ error: 'No fue posible actualizar la notificación' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}
