import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()

    const { data: notificationsData, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .is('dismissed_at', null) // Only fetch notifications that haven't been dismissed
      .order('created_at', { ascending: false }) // Order by most recent first

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError)
      return NextResponse.json({ error: 'Error fetching notifications' }, { status: 500 })
    }

    const notifications = (notificationsData || []).map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      createdAt: notification.created_at,
      readAt: notification.read_at,
      dismissedAt: notification.dismissed_at,
      caseId: notification.related_entity_type === 'case' ? notification.related_entity_id : undefined,
      taskId: notification.related_entity_type === 'task' ? notification.related_entity_id : undefined,
      // Add other fields from the new notifications table as needed
      // For now, only mapping basic fields and related entity IDs
    }))

    return NextResponse.json({ notifications })

  } catch (error) {
    console.error('Error in notifications API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
