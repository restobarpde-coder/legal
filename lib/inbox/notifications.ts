import type { SupabaseClient } from '@supabase/supabase-js'

type InboxChannel = 'whatsapp' | 'email'

/**
 * Creates persistent notifications for an inbound inbox message.
 * This helper is server-only: callers must pass the service-role client.
 */
export async function notifyInboxMessage(
  supabase: SupabaseClient,
  input: {
    conversationId: string
    messageId: string
    channel: InboxChannel
    preview: string
  },
) {
  const { data: conversation, error: conversationError } = await supabase
    .from('inbox_conversations')
    .select('id, assigned_user_id, contact_name, contact_email, contact_phone')
    .eq('id', input.conversationId)
    .single()

  if (conversationError || !conversation) {
    throw new Error(`Could not load inbox conversation for notification: ${conversationError?.message ?? 'not found'}`)
  }

  let recipientIds: string[] = conversation.assigned_user_id ? [conversation.assigned_user_id] : []

  if (recipientIds.length === 0) {
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')

    if (adminsError) {
      throw new Error(`Could not load inbox notification recipients: ${adminsError.message}`)
    }

    recipientIds = (admins ?? []).map(admin => admin.id)
  }

  if (recipientIds.length === 0) return

  const title = input.channel === 'email' ? 'Nuevo email' : 'Nuevo mensaje de WhatsApp'
  const message = input.preview || `Nuevo mensaje de ${input.channel}`

  const { error } = await supabase.from('notifications').insert(
    recipientIds.map(userId => ({
      user_id: userId,
      type: 'inbox_message',
      title,
      message,
      related_entity_type: 'inbox_conversation',
      related_entity_id: input.conversationId,
      metadata: {
        message_id: input.messageId,
        channel: input.channel,
        contact_name: conversation.contact_name,
        contact_email: conversation.contact_email,
        contact_phone: conversation.contact_phone,
      },
    })),
  )

  if (error) throw new Error(`Could not create inbox notification: ${error.message}`)
}
