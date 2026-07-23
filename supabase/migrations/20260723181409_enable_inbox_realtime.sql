-- Postgres Changes only emits rows for tables that belong to a publication.
-- Keep this migration idempotent so it is safe when a table was enabled
-- manually from the Supabase dashboard before the migration is deployed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'inbox_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.inbox_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'inbox_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.inbox_conversations;
  END IF;
END
$$;
