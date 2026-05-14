-- Enable Realtime for client changes.
-- Run this in Supabase so /dashboard/clients receives insert, update, and delete events.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'clients'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
    END IF;
  ELSE
    CREATE PUBLICATION supabase_realtime FOR TABLE public.clients;
  END IF;
END $$;

SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename = 'clients';
