-- Enable Realtime for the cases page and its visible dependencies.
-- /dashboard/cases renders cases plus related clients, and visibility depends on case_members.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'cases'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'case_members'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.case_members;
    END IF;

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
    CREATE PUBLICATION supabase_realtime
      FOR TABLE public.cases, public.case_members, public.clients;
  END IF;
END $$;

SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN ('cases', 'case_members', 'clients')
ORDER BY tablename;
