-- Verificar que la conversación de prueba se guardó correctamente
SELECT 
    chatwoot_id,
    contact_name,
    contact_email,
    inbox_name,
    inbox_channel_type,
    auto_assigned_user_id,
    CASE 
        WHEN auto_assigned_user_id = 'e325f4f3-2b11-424e-a696-1c4a8112460b' THEN 'Fernando ✅'
        WHEN auto_assigned_user_id = '3c5e7b32-1871-452d-8b08-ede5e5ccec70' THEN 'Gonzalo ✅' 
        WHEN auto_assigned_user_id = '1824785b-6260-479a-88b5-4fbcb266a23f' THEN 'Admin ✅'
        WHEN auto_assigned_user_id IS NULL THEN 'Sin asignar ❌'
        ELSE 'Usuario desconocido ❓'
    END as assigned_to,
    status,
    created_at
FROM chatwoot_conversations 
WHERE chatwoot_id = 12345
ORDER BY created_at DESC;

-- También verificar todos los mensajes
SELECT 
    chatwoot_id,
    content,
    message_type,
    sender_name,
    chatwoot_created_at
FROM chatwoot_messages 
WHERE conversation_chatwoot_id = 12345
ORDER BY chatwoot_created_at;
