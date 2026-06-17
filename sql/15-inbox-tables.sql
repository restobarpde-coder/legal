-- ============================================================
-- Migration 15: Unified inbox tables (WhatsApp + Email)
-- Run after sql/14-enable-realtime-cases.sql
-- Chatwoot tables are intentionally left intact.
-- ============================================================

-- Reuse or create the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper: is the current session an admin?
CREATE OR REPLACE FUNCTION inbox_is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- inbox_email_accounts
-- Stores IMAP/SMTP credentials, encrypted at app level.
-- encrypted_password is NEVER exposed through RLS or views.
-- ============================================================
CREATE TABLE IF NOT EXISTS inbox_email_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
    account_type    TEXT NOT NULL CHECK (account_type IN ('personal', 'shared')),

    email_address   TEXT NOT NULL UNIQUE,
    display_name    TEXT,

    imap_host       TEXT NOT NULL,
    imap_port       INT  NOT NULL DEFAULT 993,
    imap_tls        BOOLEAN NOT NULL DEFAULT true,

    smtp_host       TEXT NOT NULL,
    smtp_port       INT  NOT NULL DEFAULT 587,
    smtp_tls        BOOLEAN NOT NULL DEFAULT true,

    username        TEXT NOT NULL,
    -- AES-256-GCM ciphertext stored as "base64iv:base64tag:base64ciphertext"
    encrypted_password TEXT NOT NULL,

    last_sync_at    TIMESTAMPTZ,
    last_uid        INT NOT NULL DEFAULT 0,
    sync_enabled    BOOLEAN NOT NULL DEFAULT true,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- personal accounts must have a user_id; shared must not
    CONSTRAINT personal_requires_user CHECK (
        (account_type = 'personal' AND user_id IS NOT NULL) OR
        (account_type = 'shared'   AND user_id IS NULL)
    )
);

CREATE TRIGGER inbox_email_accounts_updated_at
    BEFORE UPDATE ON inbox_email_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Safe projection: never exposes encrypted_password
-- Used by all user-facing API responses
CREATE OR REPLACE VIEW inbox_email_accounts_safe AS
SELECT
    id, user_id, account_type,
    email_address, display_name,
    imap_host, imap_port, imap_tls,
    smtp_host, smtp_port, smtp_tls,
    username,
    last_sync_at, last_uid, sync_enabled,
    created_at, updated_at
FROM inbox_email_accounts;

-- ============================================================
-- inbox_conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS inbox_conversations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel              TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
    inbox_type           TEXT NOT NULL CHECK (inbox_type IN ('whatsapp_shared', 'email_shared', 'email_personal')),

    -- For email conversations: which account received/sends
    email_account_id     UUID REFERENCES inbox_email_accounts(id) ON DELETE SET NULL,

    -- Contact (the external party)
    contact_name         TEXT,
    contact_email        TEXT,
    contact_phone        TEXT,

    -- Team assignment
    assigned_user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,

    -- CRM links
    linked_client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    linked_case_id       UUID REFERENCES public.cases(id)   ON DELETE SET NULL,

    -- State
    status               TEXT NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open', 'pending', 'resolved', 'spam')),
    unread_count         INT  NOT NULL DEFAULT 0,
    last_message_at      TIMESTAMPTZ,
    last_message_preview TEXT,

    -- WhatsApp-specific
    wa_contact_id        TEXT,
    wa_conversation_id   TEXT,

    -- Email-specific
    email_thread_id      TEXT,   -- root Message-ID of the thread
    email_subject        TEXT,

    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER inbox_conversations_updated_at
    BEFORE UPDATE ON inbox_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- inbox_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS inbox_messages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  UUID NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,

    direction        TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content          TEXT,
    content_type     TEXT NOT NULL DEFAULT 'text'
                         CHECK (content_type IN ('text', 'image', 'document', 'audio', 'video')),

    sender_type      TEXT CHECK (sender_type IN ('contact', 'user')),
    sender_user_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
    sender_name      TEXT,

    -- WhatsApp dedup: Meta message IDs are globally unique
    wa_message_id    TEXT UNIQUE,

    -- Email dedup: Message-ID header is unique per account
    email_account_id UUID REFERENCES inbox_email_accounts(id) ON DELETE SET NULL,
    email_message_id TEXT,

    attachments      JSONB NOT NULL DEFAULT '[]',
    is_read          BOOLEAN NOT NULL DEFAULT false,
    read_at          TIMESTAMPTZ,

    wa_status        TEXT CHECK (wa_status IN ('sent', 'delivered', 'read', 'failed')),

    email_from       TEXT,
    email_to         TEXT[],
    email_cc         TEXT[],

    sent_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (email_account_id, email_message_id)
);

-- ============================================================
-- inbox_sync_runs
-- Audit log for each IMAP sync attempt
-- ============================================================
CREATE TABLE IF NOT EXISTS inbox_sync_runs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_account_id  UUID NOT NULL REFERENCES inbox_email_accounts(id) ON DELETE CASCADE,

    status            TEXT NOT NULL DEFAULT 'running'
                          CHECK (status IN ('running', 'completed', 'failed')),
    messages_fetched  INT NOT NULL DEFAULT 0,
    messages_new      INT NOT NULL DEFAULT 0,
    error_message     TEXT,

    started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at       TIMESTAMPTZ,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- inbox_webhook_events
-- Raw log of every incoming WhatsApp webhook payload
-- ============================================================
CREATE TABLE IF NOT EXISTS inbox_webhook_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel           TEXT NOT NULL CHECK (channel IN ('whatsapp')),
    event_type        TEXT NOT NULL,

    raw_payload       JSONB NOT NULL,
    processing_status TEXT NOT NULL DEFAULT 'received'
                          CHECK (processing_status IN ('received', 'processed', 'failed', 'ignored')),
    error_message     TEXT,
    processed_at      TIMESTAMPTZ,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- inbox_delivery_attempts
-- Outbound send tracking: pending → sent | failed
-- ============================================================
CREATE TABLE IF NOT EXISTS inbox_delivery_attempts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id          UUID NOT NULL REFERENCES inbox_messages(id) ON DELETE CASCADE,

    status              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'sent', 'failed')),
    provider_message_id TEXT,   -- WA wamid or SMTP Message-ID on success
    last_error          TEXT,
    attempt_number      INT  NOT NULL DEFAULT 1,

    attempted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_inbox_conv_channel        ON inbox_conversations(channel);
CREATE INDEX IF NOT EXISTS idx_inbox_conv_status         ON inbox_conversations(status);
CREATE INDEX IF NOT EXISTS idx_inbox_conv_assigned       ON inbox_conversations(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_conv_linked_client  ON inbox_conversations(linked_client_id);
CREATE INDEX IF NOT EXISTS idx_inbox_conv_email_account  ON inbox_conversations(email_account_id);
CREATE INDEX IF NOT EXISTS idx_inbox_conv_wa_contact     ON inbox_conversations(wa_contact_id);
CREATE INDEX IF NOT EXISTS idx_inbox_conv_email_thread   ON inbox_conversations(email_thread_id);
CREATE INDEX IF NOT EXISTS idx_inbox_conv_last_msg       ON inbox_conversations(last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_inbox_msg_conversation    ON inbox_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_inbox_msg_direction       ON inbox_messages(direction);
CREATE INDEX IF NOT EXISTS idx_inbox_msg_created         ON inbox_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_msg_email_account   ON inbox_messages(email_account_id);

CREATE INDEX IF NOT EXISTS idx_inbox_sync_account        ON inbox_sync_runs(email_account_id);
CREATE INDEX IF NOT EXISTS idx_inbox_sync_status         ON inbox_sync_runs(status);

CREATE INDEX IF NOT EXISTS idx_inbox_webhook_status      ON inbox_webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_inbox_webhook_created     ON inbox_webhook_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbox_delivery_message    ON inbox_delivery_attempts(message_id);
CREATE INDEX IF NOT EXISTS idx_inbox_delivery_status     ON inbox_delivery_attempts(status);

-- ============================================================
-- Row-Level Security
-- ============================================================
ALTER TABLE inbox_conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_email_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_sync_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_webhook_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_delivery_attempts  ENABLE ROW LEVEL SECURITY;

-- ── inbox_conversations ──────────────────────────────────────
-- Admin: everything. User: own assigned + unassigned (takeable).
CREATE POLICY "inbox_conv_select" ON inbox_conversations
    FOR SELECT USING (
        inbox_is_admin()
        OR assigned_user_id = auth.uid()
        OR assigned_user_id IS NULL
    );

CREATE POLICY "inbox_conv_update" ON inbox_conversations
    FOR UPDATE USING (
        inbox_is_admin()
        OR assigned_user_id = auth.uid()
        OR assigned_user_id IS NULL
    );

-- INSERT/DELETE: service role only (webhook + sync bypass RLS via service key)

-- ── inbox_messages ───────────────────────────────────────────
-- Read mirrors conversation access.
CREATE POLICY "inbox_msg_select" ON inbox_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM inbox_conversations c
            WHERE c.id = conversation_id
              AND (
                  inbox_is_admin()
                  OR c.assigned_user_id = auth.uid()
                  OR c.assigned_user_id IS NULL
              )
        )
    );

-- Outbound messages: user may insert for their own assigned conversations.
CREATE POLICY "inbox_msg_insert_outbound" ON inbox_messages
    FOR INSERT WITH CHECK (
        direction = 'outbound'
        AND sender_user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM inbox_conversations c
            WHERE c.id = conversation_id
              AND (
                  inbox_is_admin()
                  OR c.assigned_user_id = auth.uid()
              )
        )
    );

-- ── inbox_email_accounts ─────────────────────────────────────
-- Users see their own personal accounts + all shared accounts.
-- Admin sees all. encrypted_password is never in SELECT
-- (safe view used in API; base table queried only via service role).
CREATE POLICY "inbox_email_acct_select" ON inbox_email_accounts
    FOR SELECT USING (
        inbox_is_admin()
        OR user_id = auth.uid()
        OR account_type = 'shared'
    );

CREATE POLICY "inbox_email_acct_insert" ON inbox_email_accounts
    FOR INSERT WITH CHECK (inbox_is_admin());

CREATE POLICY "inbox_email_acct_update" ON inbox_email_accounts
    FOR UPDATE USING (inbox_is_admin());

CREATE POLICY "inbox_email_acct_delete" ON inbox_email_accounts
    FOR DELETE USING (inbox_is_admin());

-- ── operational tables: admin only ───────────────────────────
CREATE POLICY "inbox_sync_runs_select" ON inbox_sync_runs
    FOR SELECT USING (inbox_is_admin());

CREATE POLICY "inbox_webhook_events_select" ON inbox_webhook_events
    FOR SELECT USING (inbox_is_admin());

CREATE POLICY "inbox_delivery_select" ON inbox_delivery_attempts
    FOR SELECT USING (
        inbox_is_admin()
        OR EXISTS (
            SELECT 1 FROM inbox_messages m
            JOIN inbox_conversations c ON c.id = m.conversation_id
            WHERE m.id = message_id
              AND c.assigned_user_id = auth.uid()
        )
    );
