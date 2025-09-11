-- Chatwoot Integration Tables
-- This script creates the necessary tables for Chatwoot webhook integration

-- Table to store Chatwoot conversations
CREATE TABLE IF NOT EXISTS chatwoot_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chatwoot_id INTEGER NOT NULL UNIQUE,
    
    -- Contact information
    contact_name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    contact_identifier TEXT,
    
    -- Conversation details
    status TEXT CHECK (status IN ('open', 'resolved', 'pending')) DEFAULT 'open',
    inbox_name TEXT,
    inbox_channel_type TEXT,
    
    -- Assignment
    assignee_name TEXT,
    assignee_email TEXT,
    team_name TEXT,
    
    -- Custom data
    custom_attributes JSONB DEFAULT '{}',
    meta JSONB DEFAULT '{}',
    
    -- Chatwoot timestamps
    chatwoot_created_at TIMESTAMP WITH TIME ZONE,
    chatwoot_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Internal timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Optional: link to existing clients/cases
    linked_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    linked_case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    
    -- Processing status
    is_processed BOOLEAN DEFAULT false,
    processing_notes TEXT
);

-- Table to store Chatwoot messages
CREATE TABLE IF NOT EXISTS chatwoot_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chatwoot_id INTEGER NOT NULL UNIQUE,
    conversation_chatwoot_id INTEGER NOT NULL,
    
    -- Message content
    content TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('incoming', 'outgoing', 'activity', 'template')) NOT NULL,
    
    -- Sender information
    sender_name TEXT,
    sender_email TEXT,
    sender_type TEXT CHECK (sender_type IN ('contact', 'user')),
    
    -- Attachments and metadata
    attachments JSONB DEFAULT '[]',
    content_attributes JSONB DEFAULT '{}',
    
    -- Timestamps
    chatwoot_created_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Relationship to conversation
    conversation_id UUID REFERENCES chatwoot_conversations(id) ON DELETE CASCADE
);

-- Table to track webhook processing status
CREATE TABLE IF NOT EXISTS chatwoot_webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    chatwoot_account_id INTEGER,
    chatwoot_account_name TEXT,
    
    -- Processing details
    status TEXT CHECK (status IN ('received', 'processed', 'error')) DEFAULT 'received',
    error_message TEXT,
    processing_duration_ms INTEGER,
    
    -- Raw payload for debugging
    raw_payload JSONB,
    
    -- Timestamps
    received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Table to store Chatwoot API configuration
CREATE TABLE IF NOT EXISTS chatwoot_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Chatwoot instance details
    chatwoot_url TEXT NOT NULL,
    account_id INTEGER NOT NULL,
    access_token TEXT NOT NULL, -- Para API calls de vuelta a Chatwoot
    
    -- Webhook configuration
    webhook_secret TEXT,
    webhook_enabled BOOLEAN DEFAULT true,
    
    -- Settings
    auto_create_cases BOOLEAN DEFAULT false,
    auto_assign_to_user BOOLEAN DEFAULT true,
    default_case_type TEXT DEFAULT 'consulta',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one config per user
    UNIQUE(user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chatwoot_conversations_chatwoot_id ON chatwoot_conversations(chatwoot_id);
CREATE INDEX IF NOT EXISTS idx_chatwoot_conversations_status ON chatwoot_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chatwoot_conversations_contact_email ON chatwoot_conversations(contact_email);
CREATE INDEX IF NOT EXISTS idx_chatwoot_conversations_is_processed ON chatwoot_conversations(is_processed);
CREATE INDEX IF NOT EXISTS idx_chatwoot_conversations_linked_client ON chatwoot_conversations(linked_client_id);
CREATE INDEX IF NOT EXISTS idx_chatwoot_conversations_linked_case ON chatwoot_conversations(linked_case_id);

CREATE INDEX IF NOT EXISTS idx_chatwoot_messages_chatwoot_id ON chatwoot_messages(chatwoot_id);
CREATE INDEX IF NOT EXISTS idx_chatwoot_messages_conversation_chatwoot_id ON chatwoot_messages(conversation_chatwoot_id);
CREATE INDEX IF NOT EXISTS idx_chatwoot_messages_conversation_id ON chatwoot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatwoot_messages_message_type ON chatwoot_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_chatwoot_messages_created_at ON chatwoot_messages(chatwoot_created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatwoot_webhook_logs_event_type ON chatwoot_webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_chatwoot_webhook_logs_status ON chatwoot_webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_chatwoot_webhook_logs_received_at ON chatwoot_webhook_logs(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatwoot_config_user_id ON chatwoot_config(user_id);

-- Function to automatically link conversation_id in messages
CREATE OR REPLACE FUNCTION link_chatwoot_message_conversation()
RETURNS TRIGGER AS $$
BEGIN
    -- Find the conversation UUID from chatwoot_id
    SELECT id INTO NEW.conversation_id
    FROM chatwoot_conversations
    WHERE chatwoot_id = NEW.conversation_chatwoot_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically link messages to conversations
CREATE TRIGGER trigger_link_chatwoot_message_conversation
    BEFORE INSERT ON chatwoot_messages
    FOR EACH ROW
    EXECUTE FUNCTION link_chatwoot_message_conversation();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chatwoot_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_chatwoot_conversations_updated_at
    BEFORE UPDATE ON chatwoot_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_chatwoot_updated_at_column();

CREATE TRIGGER update_chatwoot_messages_updated_at
    BEFORE UPDATE ON chatwoot_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chatwoot_updated_at_column();

CREATE TRIGGER update_chatwoot_config_updated_at
    BEFORE UPDATE ON chatwoot_config
    FOR EACH ROW
    EXECUTE FUNCTION update_chatwoot_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE chatwoot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatwoot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatwoot_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatwoot_config ENABLE ROW LEVEL SECURITY;

-- Policies for chatwoot_conversations
-- Por ahora, permitir acceso completo para webhooks (sin autenticación de usuario)
-- Ajustar según tus necesidades de seguridad
CREATE POLICY "Allow full access to chatwoot_conversations" ON chatwoot_conversations
    FOR ALL USING (true);

-- Policies for chatwoot_messages
CREATE POLICY "Allow full access to chatwoot_messages" ON chatwoot_messages
    FOR ALL USING (true);

-- Policies for chatwoot_webhook_logs
CREATE POLICY "Allow full access to chatwoot_webhook_logs" ON chatwoot_webhook_logs
    FOR ALL USING (true);

-- Policies for chatwoot_config
CREATE POLICY "Users can only access their own chatwoot config" ON chatwoot_config
    FOR ALL USING (auth.uid() = user_id);

-- Views for easier querying
CREATE OR REPLACE VIEW chatwoot_conversations_with_messages AS
SELECT 
    c.*,
    COUNT(m.id) as message_count,
    COUNT(CASE WHEN m.message_type = 'incoming' THEN 1 END) as incoming_messages,
    COUNT(CASE WHEN m.message_type = 'outgoing' THEN 1 END) as outgoing_messages,
    MAX(m.chatwoot_created_at) as last_message_at
FROM chatwoot_conversations c
LEFT JOIN chatwoot_messages m ON c.id = m.conversation_id
GROUP BY c.id;

-- Comments for documentation
COMMENT ON TABLE chatwoot_conversations IS 'Stores conversations received from Chatwoot webhooks';
COMMENT ON TABLE chatwoot_messages IS 'Stores messages from Chatwoot conversations';
COMMENT ON TABLE chatwoot_webhook_logs IS 'Logs all webhook events for debugging and monitoring';
COMMENT ON TABLE chatwoot_config IS 'Configuration for Chatwoot integration per user';

COMMENT ON COLUMN chatwoot_conversations.is_processed IS 'Indicates if this conversation has been processed (e.g., converted to a case)';
COMMENT ON COLUMN chatwoot_conversations.linked_client_id IS 'Optional link to existing client record';
COMMENT ON COLUMN chatwoot_conversations.linked_case_id IS 'Optional link to existing case record';
