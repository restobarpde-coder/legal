import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;
    const supabase = await createClient();
    
    // Obtener mensajes de la conversación
    const { data: messages, error } = await supabase
      .from('chatwoot_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('chatwoot_created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Error fetching messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: messages || []
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
