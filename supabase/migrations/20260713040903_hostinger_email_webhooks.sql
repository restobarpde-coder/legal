-- Reliable Hostinger webhook ingestion and IMAP deduplication.

ALTER TABLE public.inbox_messages
  ADD COLUMN IF NOT EXISTS email_uid BIGINT,
  ADD COLUMN IF NOT EXISTS email_uid_validity BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS inbox_messages_account_uid_unique
  ON public.inbox_messages (email_account_id, email_uid_validity, email_uid)
  WHERE email_account_id IS NOT NULL
    AND email_uid_validity IS NOT NULL
    AND email_uid IS NOT NULL;

ALTER TABLE public.inbox_webhook_events
  DROP CONSTRAINT IF EXISTS inbox_webhook_events_channel_check;

ALTER TABLE public.inbox_webhook_events
  ADD CONSTRAINT inbox_webhook_events_channel_check
  CHECK (channel IN ('whatsapp', 'email'));

ALTER TABLE public.inbox_webhook_events
  ADD COLUMN IF NOT EXISTS provider_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS inbox_webhook_events_provider_event_unique
  ON public.inbox_webhook_events (channel, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.inbox_email_sync_locks (
  email_account_id UUID PRIMARY KEY REFERENCES public.inbox_email_accounts(id) ON DELETE CASCADE,
  locked_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_email_sync_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inbox_email_sync_locks FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.inbox_claim_email_sync(
  p_account_id UUID,
  p_ttl_seconds INTEGER DEFAULT 90
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  INSERT INTO public.inbox_email_sync_locks (email_account_id, locked_until, updated_at)
  VALUES (p_account_id, now() + make_interval(secs => p_ttl_seconds), now())
  ON CONFLICT (email_account_id) DO UPDATE
    SET locked_until = EXCLUDED.locked_until,
        updated_at = now()
    WHERE inbox_email_sync_locks.locked_until < now();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.inbox_release_email_sync(p_account_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.inbox_email_sync_locks WHERE email_account_id = p_account_id;
$$;

CREATE OR REPLACE FUNCTION public.inbox_increment_unread(p_conversation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_count INTEGER;
BEGIN
  UPDATE public.inbox_conversations
  SET unread_count = unread_count + 1
  WHERE id = p_conversation_id
  RETURNING unread_count INTO next_count;
  RETURN next_count;
END;
$$;

REVOKE ALL ON FUNCTION public.inbox_claim_email_sync(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inbox_release_email_sync(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inbox_increment_unread(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inbox_claim_email_sync(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.inbox_release_email_sync(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.inbox_increment_unread(UUID) TO service_role;
