-- =============================================================================
-- 🚀 MIGRATION: 11-create-notifications-table.sql
-- =============================================================================
-- Crear la tabla 'notifications' para almacenar notificaciones de usuario
-- y habilitar la persistencia de notificaciones en el sistema.

DO $$
BEGIN
    RAISE NOTICE '🔧 Creando extensión "uuid-ossp"...';
END $$;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
    RAISE NOTICE '🔧 Creando tabla "public.notifications"...';
END $$;

CREATE TABLE public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) ON DELETE CASCADE,
  type text not null, -- e.g., 'task_reminder', 'new_case_note', 'document_uploaded'
  title text not null,
  message text,
  created_at timestamp with time zone default now() not null,
  read_at timestamp with time zone, -- Null if unread
  dismissed_at timestamp with time zone, -- Null if not dismissed
  related_entity_type text, -- e.g., 'task', 'case', 'document'
  related_entity_id uuid, -- ID of the related entity
  metadata jsonb default '{}' -- Store additional flexible data
);

-- Indices para optimizar consultas
CREATE INDEX notifications_user_id_created_at_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_id_status_idx ON public.notifications (user_id, read_at, dismissed_at);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE '🛡️ Creando políticas RLS para "public.notifications"...';
END $$;

-- Política para que los usuarios puedan ver sus propias notificaciones
CREATE POLICY "Users can view their own notifications." ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Política para que los usuarios puedan crear notificaciones (ej. para ellos mismos, o si el sistema las crea)
CREATE POLICY "Authenticated users can insert their own notifications." ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios puedan actualizar sus propias notificaciones (ej. marcar como leída/descartada)
CREATE POLICY "Users can update their own notifications." ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Política para que los usuarios puedan eliminar sus propias notificaciones
CREATE POLICY "Users can delete their own notifications." ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

DO $$
BEGIN
    RAISE NOTICE '   ✅ Tabla "public.notifications" y políticas RLS creadas.';
    RAISE NOTICE '✅ MIGRACIÓN 11 COMPLETADA';
    RAISE NOTICE '';
END $$;
