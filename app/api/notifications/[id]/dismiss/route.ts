import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const user = await requireAuth();
    const notificationId = params.id;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id); // Ensure user can only dismiss their own notifications

    if (error) {
      console.error('Error dismissing notification:', error);
      return NextResponse.json({ error: 'Error dismissing notification' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Notification dismissed' });
  } catch (error) {
    console.error('Error in dismiss API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
