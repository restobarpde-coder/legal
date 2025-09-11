import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CHATWOOT_BASE_URL = process.env.CHATWOOT_BASE_URL || 'https://app.chatwoot.com';
const ACCESS_TOKEN = process.env.CHATWOOT_ACCESS_TOKEN || 'LBNxwhptF9BukuiRpECzgwBa';
const ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || '1';

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
  };
  messages: any[];
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  created_at: number;
  updated_at: number;
}

export async function POST() {
  try {
    console.log('🔄 Iniciando sincronización manual con Chatwoot...');
    const supabase = await createClient();

    // 1. Obtener conversaciones recientes de Chatwoot
    const chatwootResponse = await fetch(
      `${CHATWOOT_BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations?status=all&assignee_type=all`,
      {
        headers: {
          'api_access_token': ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!chatwootResponse.ok) {
      throw new Error(`Chatwoot API error: ${chatwootResponse.status}`);
    }

    const chatwootData = await chatwootResponse.json();
    const conversations: ChatwootConversation[] = chatwootData.data?.payload || [];
    
    console.log(`📊 Encontradas ${conversations.length} conversaciones en Chatwoot`);

    let syncedCount = 0;
    let newCount = 0;

    // 2. Procesar cada conversación
    for (const conversation of conversations) {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('chatwoot_conversations')
        .select('id')
        .eq('chatwoot_id', conversation.id)
        .single();

      if (!existing) {
        // Asignación automática de usuario
        let assignedUserId = null;
        const emailToUserMapping: { [key: string]: string } = {
          'admin@legal.com': '1824785b-6260-479a-88b5-4fbcb266a23f',
          'fernando@centrodeasesoramiento.com': 'e325f4f3-2b11-424e-a696-1c4a8112460b',
          'gonzalo@centrodeasesoramiento.com': '3c5e7b32-1871-452d-8b08-ede5e5ccec70'
        };

        // Asignar por inbox
        if (conversation.inbox.channel_type.includes('Email')) {
          const inboxEmail = Object.keys(emailToUserMapping).find(email => 
            conversation.inbox.name.toLowerCase().includes(email.toLowerCase())
          );
          if (inboxEmail) {
            assignedUserId = emailToUserMapping[inboxEmail];
          }
        }

        // Crear nueva conversación
        const { error } = await supabase
          .from('chatwoot_conversations')
          .insert({
            chatwoot_id: conversation.id,
            contact_name: conversation.contact.name,
            contact_email: conversation.contact.email || null,
            contact_phone: conversation.contact.phone_number || null,
            status: conversation.status,
            inbox_name: conversation.inbox.name,
            inbox_channel_type: conversation.inbox.channel_type,
            assignee_name: conversation.assignee?.name || null,
            assignee_email: conversation.assignee?.email || null,
            auto_assigned_user_id: assignedUserId,
            chatwoot_created_at: new Date(conversation.created_at * 1000).toISOString(),
            chatwoot_updated_at: new Date(conversation.updated_at * 1000).toISOString()
          });

        if (!error) {
          newCount++;
          console.log(`✅ Nueva conversación sincronizada: ${conversation.id} - ${conversation.contact.name}`);
        } else {
          console.error(`❌ Error sincronizando conversación ${conversation.id}:`, error);
        }
      }
      syncedCount++;
    }

    console.log(`✅ Sincronización completada: ${newCount} nuevas de ${syncedCount} procesadas`);

    return NextResponse.json({
      success: true,
      message: `Sincronización completada: ${newCount} nuevas conversaciones de ${syncedCount} procesadas`,
      newConversations: newCount,
      totalProcessed: syncedCount
    });

  } catch (error) {
    console.error('💥 Error en sincronización:', error);
    return NextResponse.json(
      { error: 'Error en sincronización con Chatwoot', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint de sincronización manual con Chatwoot',
    usage: 'POST para ejecutar sincronización'
  });
}
