-- ============================================================
-- Migration 19: inbox visibility by email account
-- Run after sql/18-enable-realtime-inbox.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.inbox_can_access_conversation(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.inbox_conversations c
    LEFT JOIN public.inbox_email_accounts a ON a.id = c.email_account_id
    WHERE c.id = p_conversation_id
      AND (
        public.inbox_is_admin()
        OR c.channel = 'whatsapp'
        OR (
          c.channel = 'email'
          AND a.id IS NOT NULL
          AND (a.account_type = 'shared' OR a.user_id = (select auth.uid()))
        )
      )
  );
$$;

DROP POLICY IF EXISTS "inbox_conv_select" ON public.inbox_conversations;
DROP POLICY IF EXISTS "inbox_conv_update" ON public.inbox_conversations;
DROP POLICY IF EXISTS "inbox_conv_select_assigned" ON public.inbox_conversations;
DROP POLICY IF EXISTS "inbox_conv_update_assigned" ON public.inbox_conversations;
DROP POLICY IF EXISTS "inbox_msg_select" ON public.inbox_messages;
DROP POLICY IF EXISTS "inbox_msg_select_assigned" ON public.inbox_messages;
DROP POLICY IF EXISTS "inbox_msg_insert_outbound" ON public.inbox_messages;
DROP POLICY IF EXISTS "inbox_msg_insert_outbound_assigned" ON public.inbox_messages;

CREATE POLICY "inbox_conv_select_by_account" ON public.inbox_conversations
  FOR SELECT TO authenticated
  USING (public.inbox_can_access_conversation(id));

CREATE POLICY "inbox_conv_update_by_account" ON public.inbox_conversations
  FOR UPDATE TO authenticated
  USING (public.inbox_can_access_conversation(id))
  WITH CHECK (public.inbox_can_access_conversation(id));

CREATE POLICY "inbox_msg_select_by_account" ON public.inbox_messages
  FOR SELECT TO authenticated
  USING (public.inbox_can_access_conversation(conversation_id));

CREATE POLICY "inbox_msg_insert_outbound_by_account" ON public.inbox_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    direction = 'outbound'
    AND sender_user_id = (select auth.uid())
    AND public.inbox_can_access_conversation(conversation_id)
  );

DROP POLICY IF EXISTS "inbox_delivery_select" ON public.inbox_delivery_attempts;
CREATE POLICY "inbox_delivery_select_by_account" ON public.inbox_delivery_attempts
  FOR SELECT TO authenticated
  USING (
    public.inbox_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.inbox_messages m
      WHERE m.id = message_id
        AND public.inbox_can_access_conversation(m.conversation_id)
    )
  );

-- The safe view must enforce the same account boundary when queried through
-- the Data API; credentials remain excluded from the projection.
CREATE OR REPLACE VIEW public.inbox_email_accounts_safe AS
SELECT
  id, user_id, account_type, email_address, display_name,
  imap_host, imap_port, imap_tls, smtp_host, smtp_port, smtp_tls, username,
  last_sync_at, last_uid, sync_enabled, created_at, updated_at
FROM public.inbox_email_accounts
WHERE public.inbox_is_admin()
   OR user_id = (select auth.uid())
   OR account_type = 'shared';
