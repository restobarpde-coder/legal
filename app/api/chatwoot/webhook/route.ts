import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

// Tipos para los eventos de Chatwoot
interface ChatwootContact {
  id: number;
  name: string;
  email?: string;
  phone_number?: string;
  identifier?: string;
  thumbnail?: string;
  custom_attributes?: Record<string, any>;
}

interface ChatwootConversation {
  id: number;
  messages: any[];
  contact: ChatwootContact;
  inbox: {
    id: number;
    name: string;
    channel_type: string;
  };
  status: 'open' | 'resolved' | 'pending';
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  team?: {
    id: number;
    name: string;
  };
  meta?: Record<string, any>;
  custom_attributes?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface ChatwootMessage {
  id: number;
  content: string;
  message_type: 'incoming' | 'outgoing' | 'activity' | 'template';
  created_at: string;
  conversation_id: number;
  attachments?: Array<{
    id: number;
    file_url: string;
    file_type: string;
    file_size: number;
  }>;
  sender?: {
    id: number;
    name: string;
    email?: string;
    type: 'contact' | 'user';
  };
  content_attributes?: Record<string, any>;
}

interface ChatwootWebhookPayload {
  event: string;
  account: {
    id: number;
    name: string;
  };
  conversation?: ChatwootConversation;
  message?: ChatwootMessage;
  contact?: ChatwootContact;
  inbox?: any;
  changed_attributes?: Record<string, any>;
}

// Chatwoot no requiere verificación de firma según su documentación oficial

// Función para procesar conversación nueva o actualizada
async function processConversation(conversation: ChatwootConversation, eventType: string) {
  const supabase = await createClient();
  
  try {
    // Verificar si ya existe la conversación
    const { data: existingConversation } = await supabase
      .from('chatwoot_conversations')
      .select('*')
      .eq('chatwoot_id', conversation.id)
      .single();

    // Asignar usuario automáticamente basado en el inbox
    let assignedUserId = null;
    let assignmentReason = 'sin_asignar';
    
    // Mapeo de emails del estudio a user_ids (datos reales)
    const emailToUserMapping: { [key: string]: string } = {
      'admin@legal.com': '1824785b-6260-479a-88b5-4fbcb266a23f',
      'fernando@centrodeasesoramiento.com': 'e325f4f3-2b11-424e-a696-1c4a8112460b',
      'gonzalo@centrodeasesoramiento.com': '3c5e7b32-1871-452d-8b08-ede5e5ccec70'
    };
    
    if (eventType === 'created') {
      // 1. Asignación por inbox de email personal
      if (conversation.inbox.channel_type.includes('Email')) {
        // El inbox name debería contener el email del abogado
        const inboxEmail = Object.keys(emailToUserMapping).find(email => 
          conversation.inbox.name.toLowerCase().includes(email.toLowerCase())
        );
        
        if (inboxEmail && emailToUserMapping[inboxEmail]) {
          assignedUserId = emailToUserMapping[inboxEmail];
          assignmentReason = `inbox_email_${inboxEmail}`;
        }
      }
      
      // 2. Si no se asignó por inbox, buscar por cliente existente
      if (!assignedUserId && conversation.contact.email) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('user_id, id, email')
          .eq('email', conversation.contact.email)
          .single();
        
        if (existingClient) {
          assignedUserId = existingClient.user_id;
          assignmentReason = `cliente_existente_${existingClient.email}`;
        }
      }
      
      // 3. Para WhatsApp, por ahora no asignar automáticamente (todos pueden ver)
      if (conversation.inbox.channel_type.includes('WhatsApp')) {
        assignmentReason = 'whatsapp_compartido';
      }
      
      if (assignedUserId) {
        console.log(`Auto-asignada conversación ${conversation.id} al usuario ${assignedUserId} por: ${assignmentReason}`);
      } else {
        console.log(`Conversación ${conversation.id} sin asignar. Razón: ${assignmentReason}`);
      }
    }

    const conversationData = {
      chatwoot_id: conversation.id,
      contact_name: conversation.contact.name,
      contact_email: conversation.contact.email || null,
      contact_phone: conversation.contact.phone_number || null,
      contact_identifier: conversation.contact.identifier || null,
      status: conversation.status,
      inbox_name: conversation.inbox.name,
      inbox_channel_type: conversation.inbox.channel_type,
      assignee_name: conversation.assignee?.name || null,
      assignee_email: conversation.assignee?.email || null,
      team_name: conversation.team?.name || null,
      custom_attributes: conversation.custom_attributes || {},
      meta: conversation.meta || {},
      chatwoot_created_at: conversation.created_at,
      chatwoot_updated_at: conversation.updated_at,
      updated_at: new Date().toISOString(),
      // Asignación automática
      auto_assigned_user_id: assignedUserId
    };

    if (existingConversation) {
      // Actualizar conversación existente
      await supabase
        .from('chatwoot_conversations')
        .update(conversationData)
        .eq('id', existingConversation.id);
      
      console.log(`Conversación actualizada: ${conversation.id}`);
    } else {
      // Crear nueva conversación
      await supabase
        .from('chatwoot_conversations')
        .insert({
          ...conversationData,
          created_at: new Date().toISOString()
        });
      
      console.log(`Nueva conversación creada: ${conversation.id}`);
    }

    return true;
  } catch (error) {
    console.error('Error procesando conversación:', error);
    return false;
  }
}

// Función para procesar mensaje nuevo
async function processMessage(message: ChatwootMessage, conversation?: ChatwootConversation) {
  const supabase = await createClient();
  
  try {
    const messageData = {
      chatwoot_id: message.id,
      conversation_chatwoot_id: message.conversation_id,
      content: message.content,
      message_type: message.message_type,
      sender_name: message.sender?.name || null,
      sender_email: message.sender?.email || null,
      sender_type: message.sender?.type || null,
      attachments: message.attachments || [],
      content_attributes: message.content_attributes || {},
      chatwoot_created_at: message.created_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('chatwoot_messages')
      .insert(messageData);
    
    console.log(`Nuevo mensaje guardado: ${message.id} para conversación ${message.conversation_id}`);
    return true;
  } catch (error) {
    console.error('Error procesando mensaje:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let webhookLogId: string | null = null;
  
  try {
    const body = await request.text();
    const payload: ChatwootWebhookPayload = JSON.parse(body);
    
    // Crear log de webhook recibido
    const supabase = await createClient();
    const { data: logData } = await supabase
      .from('chatwoot_webhook_logs')
      .insert({
        event_type: payload.event,
        chatwoot_account_id: payload.account.id,
        chatwoot_account_name: payload.account.name,
        raw_payload: payload,
        status: 'received'
      })
      .select('id')
      .single();
    
    webhookLogId = logData?.id || null;
    
    // Chatwoot no usa firma/secret en sus webhooks según documentación oficial
    console.log('✅ Webhook recibido de Chatwoot - Sin verificación de firma necesaria');

    console.log(`Webhook recibido: ${payload.event} para cuenta ${payload.account.name}`);

    // Procesar según el tipo de evento
    switch (payload.event) {
      case 'conversation_created':
        if (payload.conversation) {
          await processConversation(payload.conversation, 'created');
        }
        break;

      case 'conversation_updated':
        if (payload.conversation) {
          await processConversation(payload.conversation, 'updated');
        }
        break;

      case 'conversation_status_changed':
        if (payload.conversation) {
          await processConversation(payload.conversation, 'status_changed');
        }
        break;

      case 'message_created':
        if (payload.message) {
          await processMessage(payload.message, payload.conversation);
        }
        break;

      case 'message_updated':
        if (payload.message) {
          // Actualizar mensaje existente
          const supabase = await createClient();
          await supabase
            .from('chatwoot_messages')
            .update({
              content: payload.message.content,
              content_attributes: payload.message.content_attributes || {},
              updated_at: new Date().toISOString()
            })
            .eq('chatwoot_id', payload.message.id);
        }
        break;

      case 'contact_created':
      case 'contact_updated':
        // Procesar contacto si es necesario
        console.log(`Evento de contacto: ${payload.event}`);
        break;

      default:
        console.log(`Evento no manejado: ${payload.event}`);
    }

    // Actualizar log con éxito
    if (webhookLogId) {
      await supabase
        .from('chatwoot_webhook_logs')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          processing_duration_ms: Date.now() - startTime
        })
        .eq('id', webhookLogId);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Webhook ${payload.event} procesado correctamente` 
    });

  } catch (error) {
    console.error('Error procesando webhook de Chatwoot:', error);
    
    // Actualizar log con error si existe
    if (webhookLogId) {
      try {
        const supabase = await createClient();
        await supabase
          .from('chatwoot_webhook_logs')
          .update({
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            processed_at: new Date().toISOString(),
            processing_duration_ms: Date.now() - startTime
          })
          .eq('id', webhookLogId);
      } catch (logError) {
        console.error('Error updating webhook log:', logError);
      }
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}

// Método GET para verificar que el endpoint está funcionando
export async function GET() {
  return NextResponse.json({ 
    status: 'Chatwoot webhook endpoint funcionando',
    timestamp: new Date().toISOString() 
  });
}
