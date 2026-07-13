-- ============================================================
-- Migration 16: Legal/notarial inbox refinement
-- Run after sql/15-inbox-tables.sql
-- ============================================================

-- Contacts that have written to the firm but are not necessarily clients.
CREATE TABLE IF NOT EXISTS public.inbox_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  phone TEXT,
  linked_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'prospect'
    CHECK (kind IN ('client', 'prospect', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS inbox_contacts_unique_email
  ON public.inbox_contacts (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS inbox_contacts_unique_phone
  ON public.inbox_contacts (phone) WHERE phone IS NOT NULL;

CREATE TRIGGER inbox_contacts_updated_at
  BEFORE UPDATE ON public.inbox_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.inbox_conversations
  ADD COLUMN IF NOT EXISTS inbox_contact_id UUID REFERENCES public.inbox_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS classification TEXT NOT NULL DEFAULT 'consultation'
    CHECK (classification IN ('consultation', 'appointment', 'client_matter', 'notarial', 'other')),
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

CREATE INDEX IF NOT EXISTS idx_inbox_conv_contact ON public.inbox_conversations(inbox_contact_id);
CREATE INDEX IF NOT EXISTS idx_inbox_conv_classification ON public.inbox_conversations(classification);
CREATE INDEX IF NOT EXISTS idx_inbox_conv_priority ON public.inbox_conversations(priority);

CREATE TABLE IF NOT EXISTS public.inbox_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#64748b',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inbox_conversation_labels (
  conversation_id UUID NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.inbox_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, label_id)
);

CREATE TABLE IF NOT EXISTS public.inbox_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER inbox_notes_updated_at
  BEFORE UPDATE ON public.inbox_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.inbox_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.inbox_messages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  source TEXT NOT NULL CHECK (source IN ('upload', 'whatsapp', 'email')),
  provider_media_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_attachments_message ON public.inbox_attachments(message_id);

-- A private bucket. Files are uploaded and served through authenticated
-- server routes, never directly from a browser with a public URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('inbox-attachments', 'inbox-attachments', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;

-- Secure the original migration's policies. Regular users can only access
-- conversations assigned to them; assignment and account configuration stay
-- administrative operations.
DROP POLICY IF EXISTS "inbox_conv_select" ON public.inbox_conversations;
DROP POLICY IF EXISTS "inbox_conv_update" ON public.inbox_conversations;
DROP POLICY IF EXISTS "inbox_msg_select" ON public.inbox_messages;
DROP POLICY IF EXISTS "inbox_msg_insert_outbound" ON public.inbox_messages;

CREATE POLICY "inbox_conv_select_assigned" ON public.inbox_conversations
  FOR SELECT TO authenticated
  USING (public.inbox_is_admin() OR assigned_user_id = (select auth.uid()));

CREATE POLICY "inbox_conv_update_assigned" ON public.inbox_conversations
  FOR UPDATE TO authenticated
  USING (public.inbox_is_admin() OR assigned_user_id = (select auth.uid()))
  WITH CHECK (
    public.inbox_is_admin()
    OR (assigned_user_id = (select auth.uid()) AND assigned_user_id = (select auth.uid()))
  );

CREATE POLICY "inbox_msg_select_assigned" ON public.inbox_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.inbox_conversations c
    WHERE c.id = conversation_id
      AND (public.inbox_is_admin() OR c.assigned_user_id = (select auth.uid()))
  ));

CREATE POLICY "inbox_msg_insert_outbound_assigned" ON public.inbox_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    direction = 'outbound' AND sender_user_id = (select auth.uid()) AND EXISTS (
      SELECT 1 FROM public.inbox_conversations c
      WHERE c.id = conversation_id
        AND (public.inbox_is_admin() OR c.assigned_user_id = (select auth.uid()))
    )
  );

ALTER TABLE public.inbox_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_conversation_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbox_contacts_access" ON public.inbox_contacts
  FOR SELECT TO authenticated USING (
    public.inbox_is_admin() OR EXISTS (
      SELECT 1 FROM public.inbox_conversations c
      WHERE c.inbox_contact_id = id AND c.assigned_user_id = (select auth.uid())
    )
  );
CREATE POLICY "inbox_labels_access" ON public.inbox_labels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "inbox_note_select" ON public.inbox_notes
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.inbox_conversations c
    WHERE c.id = conversation_id
      AND (public.inbox_is_admin() OR c.assigned_user_id = (select auth.uid()))
  ));
CREATE POLICY "inbox_note_insert" ON public.inbox_notes
  FOR INSERT TO authenticated WITH CHECK (
    author_user_id = (select auth.uid()) AND EXISTS (
      SELECT 1 FROM public.inbox_conversations c
      WHERE c.id = conversation_id
        AND (public.inbox_is_admin() OR c.assigned_user_id = (select auth.uid()))
    )
  );
CREATE POLICY "inbox_attachment_select" ON public.inbox_attachments
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.inbox_messages m
    JOIN public.inbox_conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id
      AND (public.inbox_is_admin() OR c.assigned_user_id = (select auth.uid()))
  ));

-- The credential table must never be readable through the Data API. The
-- projection below enforces caller-specific visibility while only returning
-- non-sensitive fields.
REVOKE ALL ON TABLE public.inbox_email_accounts FROM anon, authenticated;
DROP VIEW IF EXISTS public.inbox_email_accounts_safe;
CREATE VIEW public.inbox_email_accounts_safe AS
SELECT
  id, user_id, account_type, email_address, display_name,
  imap_host, imap_port, imap_tls, smtp_host, smtp_port, smtp_tls, username,
  last_sync_at, last_uid, sync_enabled, created_at, updated_at
FROM public.inbox_email_accounts
WHERE public.inbox_is_admin()
   OR user_id = (select auth.uid())
   OR account_type = 'shared';
REVOKE ALL ON public.inbox_email_accounts_safe FROM PUBLIC;
GRANT SELECT ON public.inbox_email_accounts_safe TO authenticated;

INSERT INTO public.inbox_labels (name, color) VALUES
  ('Cliente', '#0f766e'),
  ('Consulta', '#2563eb'),
  ('Cita', '#7c3aed'),
  ('Notarial', '#b45309'),
  ('Urgente', '#dc2626')
ON CONFLICT (name) DO NOTHING;
