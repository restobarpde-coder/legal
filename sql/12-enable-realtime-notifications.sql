-- =============================================================================
-- 🚀 MIGRATION: 12-enable-realtime-notifications.sql (FIXED)
-- =============================================================================

DO $$
BEGIN
    -- 1. Verificar si la publicación 'supabase_realtime' existe
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        
        -- 2. Verificar si la tabla ya está en la publicación para evitar errores
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND schemaname = 'public'
            AND tablename = 'notifications'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
            RAISE NOTICE '✅ Tabla "notifications" añadida a "supabase_realtime".';
        ELSE
            RAISE NOTICE 'ℹ️ La tabla "notifications" ya estaba en "supabase_realtime".';
        END IF;
        
    ELSE
        -- 3. Si no existe la publicación, crearla
        CREATE PUBLICATION supabase_realtime FOR TABLE public.notifications;
        RAISE NOTICE '✅ Publicación "supabase_realtime" creada con la tabla "notifications".';
    END IF;
END $$;
