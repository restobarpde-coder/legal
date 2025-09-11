import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    const { notes } = await request.json();
    const supabase = await createClient();
    
    // Marcar conversación como procesada
    const { error } = await supabase
      .from('chatwoot_conversations')
      .update({
        is_processed: true,
        processing_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) {
      console.error('Error updating conversation:', error);
      return NextResponse.json(
        { error: 'Error updating conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation marked as processed'
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
