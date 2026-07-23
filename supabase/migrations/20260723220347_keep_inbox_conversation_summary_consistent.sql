CREATE OR REPLACE FUNCTION public.sync_inbox_conversation_from_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  message_at timestamptz := COALESCE(NEW.sent_at, NEW.created_at, now());
  attachment_count integer := jsonb_array_length(COALESCE(NEW.attachments, '[]'::jsonb));
  message_preview text := COALESCE(
    NULLIF(left(NEW.content, 200), ''),
    CASE
      WHEN attachment_count > 0
        THEN '[' || attachment_count || CASE WHEN attachment_count = 1 THEN ' archivo]' ELSE ' archivos]' END
      ELSE '[' || NEW.content_type::text || ']'
    END
  );
BEGIN
  UPDATE public.inbox_conversations
  SET
    last_message_at = CASE
      WHEN last_message_at IS NULL OR message_at >= last_message_at THEN message_at
      ELSE last_message_at
    END,
    last_message_preview = CASE
      WHEN last_message_at IS NULL OR message_at >= last_message_at THEN message_preview
      ELSE last_message_preview
    END,
    unread_count = CASE
      WHEN TG_OP = 'INSERT'
        AND NEW.direction = 'inbound'
        AND NOT COALESCE(NEW.is_read, false)
        THEN COALESCE(unread_count, 0) + 1
      ELSE COALESCE(unread_count, 0)
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_inbox_conversation_after_message_insert
  ON public.inbox_messages;

DROP TRIGGER IF EXISTS sync_inbox_conversation_after_message_change
  ON public.inbox_messages;

CREATE TRIGGER sync_inbox_conversation_after_message_change
AFTER INSERT OR UPDATE OF content, content_type, attachments, sent_at
ON public.inbox_messages
FOR EACH ROW
EXECUTE FUNCTION public.sync_inbox_conversation_from_message();

DO $$
DECLARE
  realtime_table text;
BEGIN
  FOREACH realtime_table IN ARRAY ARRAY[
    'inbox_messages',
    'notifications'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = realtime_table
    ) THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        realtime_table
      );
    END IF;
  END LOOP;
END
$$;
