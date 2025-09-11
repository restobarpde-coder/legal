-- Agregar columna para asignación de usuario a conversaciones de Chatwoot
-- Ejecuta este script para permitir que cada usuario vea solo sus conversaciones

ALTER TABLE chatwoot_conversations 
ADD COLUMN IF NOT EXISTS auto_assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Agregar índice para mejor performance en filtros
CREATE INDEX IF NOT EXISTS idx_chatwoot_conversations_assigned_user 
ON chatwoot_conversations(auto_assigned_user_id);

-- Actualizar la vista para incluir información de usuario
CREATE OR REPLACE VIEW chatwoot_conversations_with_messages AS
SELECT 
    c.*,
    u.email as assigned_user_email,
    COALESCE(up.full_name, u.email) as assigned_user_name,
    COUNT(m.id) as message_count,
    COUNT(CASE WHEN m.message_type = 'incoming' THEN 1 END) as incoming_messages,
    COUNT(CASE WHEN m.message_type = 'outgoing' THEN 1 END) as outgoing_messages,
    MAX(m.chatwoot_created_at) as last_message_at
FROM chatwoot_conversations c
LEFT JOIN chatwoot_messages m ON c.id = m.conversation_id
LEFT JOIN auth.users u ON c.auto_assigned_user_id = u.id
LEFT JOIN user_profiles up ON c.auto_assigned_user_id = up.id
GROUP BY c.id, u.email, up.full_name;

-- Comentarios
COMMENT ON COLUMN chatwoot_conversations.auto_assigned_user_id IS 'Usuario al que se asignó automáticamente esta conversación basado en el cliente existente';

-- Actualizar políticas RLS para filtrar por usuario
DROP POLICY IF EXISTS "Allow full access to chatwoot_conversations" ON chatwoot_conversations;

-- Nueva política: usuarios pueden ver conversaciones asignadas a ellos o sin asignar
CREATE POLICY "Users can access assigned conversations" ON chatwoot_conversations
    FOR SELECT USING (
        auth.uid() = auto_assigned_user_id OR 
        auto_assigned_user_id IS NULL OR
        -- Admins pueden ver todo
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Política para insertar (webhooks necesitan acceso completo)
CREATE POLICY "Allow webhook inserts" ON chatwoot_conversations
    FOR INSERT WITH CHECK (true);

-- Política para actualizar (webhooks y usuarios asignados)
CREATE POLICY "Allow webhook and assigned user updates" ON chatwoot_conversations
    FOR UPDATE USING (
        auto_assigned_user_id IS NULL OR 
        auth.uid() = auto_assigned_user_id OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
