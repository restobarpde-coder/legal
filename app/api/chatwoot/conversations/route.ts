import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Obtener conversaciones con estadísticas de mensajes
    const { data: conversations, error } = await supabase
      .from('chatwoot_conversations_with_messages')
      .select('*')
      .order('chatwoot_updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json(
        { error: 'Error fetching conversations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversations: conversations || []
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
