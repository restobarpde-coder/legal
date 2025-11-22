import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const user = await requireAuth();
    const notificationId = (await params).id;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id); // Ensure user can only mark their own notifications as read

    if (error) {
      console.error('Error marking notification as read:', error);
      return NextResponse.json({ error: 'Error marking notification as read' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error in mark as read API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
