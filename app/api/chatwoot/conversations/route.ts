import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CHATWOOT_BASE_URL = process.env.CHATWOOT_BASE_URL || 'https://app.chatwoot.com';
const CHATWOOT_ACCESS_TOKEN = process.env.CHATWOOT_ACCESS_TOKEN;
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || '1';

interface ChatwootConversation {
  id: number;
  account_id: number;
  inbox: {
    id: number;
    name: string;
    channel_type: string;
  };
  status: string;
  contact: {
    id: number;
    name: string;
    email?: string;
    phone_number?: string;
    identifier?: string;
  };
  messages?: any[];
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  meta?: {
    sender?: {
      name: string;
      email: string;
    };
  };
  created_at: number;
  timestamp: number;
}

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Obtener usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obtener info del usuario incluyendo rol y email de Chatwoot
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('id, email, role, chatwoot_agent_email, chatwoot_agent_id, chatwoot_sync_enabled')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      console.error('Error fetching user data:', userDataError);
      return NextResponse.json(
        { error: 'Error fetching user data' },
        { status: 500 }
      );
    }

    const isAdmin = userData.role === 'admin';
    const userChatwootEmail = userData.chatwoot_agent_email || userData.email;
    const userChatwootAgentId = userData.chatwoot_agent_id;

    // Obtener conversaciones desde Chatwoot API
    const chatwootResponse = await fetch(
      `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations?status=all`,
      {
        headers: {
          'api_access_token': CHATWOOT_ACCESS_TOKEN!,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!chatwootResponse.ok) {
      console.error('Chatwoot API error:', chatwootResponse.status);
      return NextResponse.json(
        { error: 'Error fetching from Chatwoot' },
        { status: 500 }
      );
    }

    const chatwootData = await chatwootResponse.json();
    let conversations: ChatwootConversation[] = chatwootData.data?.payload || [];
    
    console.log('📊 Chatwoot API Response:', {
      total_conversations: conversations.length,
      user_agent_id: userChatwootAgentId,
      user_email: userChatwootEmail,
      is_admin: isAdmin,
      sync_enabled: userData.chatwoot_sync_enabled
    });

    // Filtrar conversaciones si el usuario no es admin y tiene sync habilitado
    if (!isAdmin && userData.chatwoot_sync_enabled && userChatwootAgentId) {
      console.log('🔍 Filtrando conversaciones para:', {
        userChatwootAgentId,
        userChatwootEmail,
        total_before_filter: conversations.length
      });
      
      // Verificar estructura de assignee
      if (conversations.length > 0) {
        console.log('📝 Ejemplo assignee:', conversations[0].assignee || conversations[0].meta?.assignee);
      }
      
      conversations = conversations.filter(conv => {
        const assignee = conv.meta?.assignee || conv.assignee;
        const matches = assignee?.id === userChatwootAgentId || assignee?.email === userChatwootEmail;
        console.log(`Conversación ${conv.id}: assignee=${assignee?.id}, matches=${matches}`);
        return matches;
      });
      
      console.log('✅ Después del filtro:', conversations.length);
    }

    // Transformar al formato esperado por el frontend
    const transformedConversations = conversations.map(conv => {
      const sender = conv.meta?.sender || {};
      const assignee = conv.meta?.assignee || conv.assignee || {};
      
      return {
        id: conv.id.toString(),
        chatwoot_id: conv.id,
        contact_name: sender.name || sender.email || 'Sin nombre',
        contact_email: sender.email || null,
        contact_phone: sender.phone_number || null,
        contact_identifier: sender.identifier || null,
        status: conv.status,
        inbox_name: conv.meta?.channel || `Inbox ${conv.inbox_id}`,
        inbox_channel_type: conv.meta?.channel || 'unknown',
        assignee_name: assignee.name || assignee.available_name || null,
        assignee_email: assignee.email || null,
        team_name: null,
        message_count: conv.messages?.length || 0,
        incoming_messages: conv.messages?.filter((m: any) => m.message_type === 0).length || 0,
        outgoing_messages: conv.messages?.filter((m: any) => m.message_type === 1).length || 0,
        last_message_at: new Date((conv.last_activity_at || conv.timestamp) * 1000).toISOString(),
        chatwoot_created_at: new Date(conv.created_at * 1000).toISOString(),
        chatwoot_updated_at: new Date((conv.updated_at || conv.timestamp) * 1000).toISOString(),
        is_processed: false,
        linked_client_id: null,
        linked_case_id: null,
        processing_notes: null
      };
    });

    return NextResponse.json({
      success: true,
      conversations: transformedConversations,
      user_id: user.id,
      user_email: userData.email,
      chatwoot_email: userChatwootEmail,
      chatwoot_agent_id: userChatwootAgentId,
      is_admin: isAdmin,
      sync_enabled: userData.chatwoot_sync_enabled,
      total_in_chatwoot: (chatwootData.data?.payload || []).length,
      filtered_count: transformedConversations.length
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
