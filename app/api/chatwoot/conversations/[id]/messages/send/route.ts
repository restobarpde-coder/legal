import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CHATWOOT_BASE_URL = process.env.CHATWOOT_BASE_URL || 'https://app.chatwoot.com';
const CHATWOOT_ACCESS_TOKEN = process.env.CHATWOOT_ACCESS_TOKEN;
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || '1';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obtener datos del usuario (para registrar quién envía)
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Obtener el contenido del mensaje
    const body = await request.json();
    const { content, message_type = 'outgoing', private_note = false } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'El mensaje no puede estar vacío' },
        { status: 400 }
      );
    }

    // Enviar mensaje a Chatwoot
    const chatwootResponse = await fetch(
      `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'api_access_token': CHATWOOT_ACCESS_TOKEN!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content.trim(),
          message_type: message_type,
          private: private_note
        })
      }
    );

    if (!chatwootResponse.ok) {
      const errorData = await chatwootResponse.json();
      console.error('Chatwoot API error:', errorData);
      return NextResponse.json(
        { error: 'Error enviando mensaje a Chatwoot', details: errorData },
        { status: chatwootResponse.status }
      );
    }

    const messageData = await chatwootResponse.json();

    return NextResponse.json({
      success: true,
      message: messageData,
      sent_by: userData?.full_name || user.email
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
