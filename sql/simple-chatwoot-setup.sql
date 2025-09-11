-- Ejecutar este script simple:
ALTER TABLE chatwoot_conversations 
ADD COLUMN IF NOT EXISTS auto_assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chatwoot_conversations_assigned_user 
ON chatwoot_conversations(auto_assigned_user_id);

-- Por ahora, todos pueden ver todas las conversaciones (simplificar)
DROP POLICY IF EXISTS "Allow full access to chatwoot_conversations" ON chatwoot_conversations;
CREATE POLICY "Allow full access to chatwoot_conversations" ON chatwoot_conversations FOR ALL USING (true);
