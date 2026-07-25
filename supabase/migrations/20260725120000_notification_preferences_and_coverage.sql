-- =============================================================================
-- Notificaciones: preferencias por usuario + cobertura completa
-- =============================================================================
-- 1. `notification_preferences`: una fila por (usuario, tipo) SOLO cuando el
--    usuario cambia el default. La ausencia de fila = notificación activa, así
--    el catálogo de tipos vive en `lib/notifications/catalog.ts` y la base no
--    necesita sembrarse ni migrarse cada vez que se agrega un tipo.
-- 2. `create_notification()`: único punto de inserción. Consulta las
--    preferencias antes de escribir, de modo que apagar un tipo en el panel
--    apaga TODOS los caminos (triggers, cron y código TS) sin tocarlos.
-- 3. Cobertura nueva: asignación a casos, cambio de estado, documentos subidos,
--    vencimientos de casos y recordatorios de agenda.
--
-- Ejecutar en el SQL Editor de Supabase con el rol postgres.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Preferencias por usuario
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       text NOT NULL,
  -- Se crea la notificación (campana + realtime).
  enabled    boolean NOT NULL DEFAULT true,
  -- Además dispara notificación nativa del sistema con la pestaña en segundo
  -- plano. Lo consume el cliente; la base solo lo persiste.
  push       boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, type)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their notification preferences" ON public.notification_preferences;
CREATE POLICY "Users read their notification preferences" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert their notification preferences" ON public.notification_preferences;
CREATE POLICY "Users insert their notification preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their notification preferences" ON public.notification_preferences;
CREATE POLICY "Users update their notification preferences" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete their notification preferences" ON public.notification_preferences;
CREATE POLICY "Users delete their notification preferences" ON public.notification_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 2. Compuerta de preferencias + creación centralizada
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notification_enabled(p_user uuid, p_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.notification_preferences
      WHERE user_id = p_user AND type = p_type),
    true
  );
$$;

REVOKE ALL ON FUNCTION public.notification_enabled(uuid, text) FROM public, anon;

-- Devuelve el id creado, o NULL si el usuario tiene el tipo apagado. Los
-- llamadores usan ese NULL solo como señal; nunca deben fallar por eso.
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user        uuid,
  p_type        text,
  p_title       text,
  p_message     text,
  p_entity_type text,
  p_entity_id   uuid,
  p_metadata    jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_user IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT public.notification_enabled(p_user, p_type) THEN
    RETURN NULL;
  END IF;

  -- No notificar a usuarios dados de baja: sus filas quedarían huérfanas.
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user AND deleted_at IS NULL AND COALESCE(is_active, true)
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications
    (user_id, type, title, message, related_entity_type, related_entity_id, metadata)
  VALUES
    (p_user, p_type, p_title, p_message, p_entity_type, p_entity_id, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, text, uuid, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, uuid, jsonb) TO service_role;

-- Equipo de un caso: miembros + abogado responsable + creador, sin repetidos.
CREATE OR REPLACE FUNCTION public.case_recipients(p_case uuid)
RETURNS TABLE (recipient_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT u.id
  FROM public.users u
  WHERE u.deleted_at IS NULL
    AND COALESCE(u.is_active, true)
    AND (
      u.id IN (SELECT cm.user_id FROM public.case_members cm WHERE cm.case_id = p_case)
      OR u.id IN (SELECT c.assigned_lawyer FROM public.cases c WHERE c.id = p_case)
      OR u.id IN (SELECT c.created_by FROM public.cases c WHERE c.id = p_case)
    );
$$;

REVOKE ALL ON FUNCTION public.case_recipients(uuid) FROM public, anon;

-- -----------------------------------------------------------------------------
-- 3. Tareas: mismos avisos que antes, ahora pasando por la compuerta
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_task_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_recipient uuid;
  v_metadata jsonb;
BEGIN
  -- Nunca bloquear la escritura de la tarea por un problema de notificación.
  BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
      RETURN NEW;
    END IF;

    v_metadata := jsonb_build_object(
      'taskTitle', NEW.title,
      'priority', NEW.priority,
      'caseId', NEW.case_id,
      'dueDate', NEW.due_date
    );

    IF TG_OP = 'INSERT' THEN
      IF NEW.assigned_to IS NOT NULL
         AND NEW.assigned_to IS DISTINCT FROM COALESCE(v_actor, NEW.created_by) THEN
        PERFORM public.create_notification(
          NEW.assigned_to, 'task_assigned', 'Nueva tarea asignada',
          'Se te ha asignado la tarea "' || NEW.title || '"',
          'task', NEW.id, v_metadata
        );
      END IF;
      RETURN NEW;
    END IF;

    -- UPDATE ------------------------------------------------------------------
    IF NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       AND NEW.assigned_to IS DISTINCT FROM v_actor THEN
      PERFORM public.create_notification(
        NEW.assigned_to, 'task_assigned', 'Nueva tarea asignada',
        'Se te ha asignado la tarea "' || NEW.title || '"',
        'task', NEW.id, v_metadata
      );
    ELSIF NEW.due_date IS DISTINCT FROM OLD.due_date
       AND NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM v_actor THEN
      PERFORM public.create_notification(
        NEW.assigned_to, 'task_updated', 'Actualización de tarea',
        'La fecha de vencimiento de "' || NEW.title || '" ha cambiado',
        'task', NEW.id, v_metadata
      );
    END IF;

    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
      FOR v_recipient IN
        SELECT DISTINCT u FROM unnest(ARRAY[NEW.created_by, NEW.assigned_to]) AS u
        WHERE u IS NOT NULL AND u IS DISTINCT FROM v_actor
      LOOP
        PERFORM public.create_notification(
          v_recipient, 'task_completed', 'Tarea completada',
          'La tarea "' || NEW.title || '" ha sido completada',
          'task', NEW.id,
          jsonb_build_object('taskTitle', NEW.title, 'priority', NEW.priority, 'caseId', NEW.case_id)
        );
      END LOOP;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_task_change failed for task %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_task_change() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_task_change ON public.tasks;
CREATE TRIGGER trg_notify_task_change
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_change();

-- Recordatorios de tareas: idéntica escalera de umbrales, con la compuerta
-- chequeada antes del trabajo de deduplicación.
CREATE OR REPLACE FUNCTION public.process_task_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task record;
  v_intervals numeric[];
  v_hours numeric;
  v_bucket numeric;
  v_urgency text;
  v_message text;
  v_due_key text;
  v_reminders int := 0;
  v_overdue int := 0;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('process_task_reminders')) THEN
    RETURN jsonb_build_object('skipped', true);
  END IF;

  FOR v_task IN
    SELECT id, title, priority::text AS priority, due_date, assigned_to, case_id
    FROM public.tasks
    WHERE deleted_at IS NULL
      AND assigned_to IS NOT NULL
      AND due_date IS NOT NULL
      AND status NOT IN ('completed', 'cancelled')
      AND due_date BETWEEN now() - interval '7 days' AND now() + interval '7 days'
  LOOP
    v_hours := extract(epoch FROM (v_task.due_date - now())) / 3600.0;
    v_due_key := v_task.due_date::text;

    IF v_hours < 0 THEN
      IF public.notification_enabled(v_task.assigned_to, 'task_overdue')
         AND NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE related_entity_type = 'task'
          AND related_entity_id = v_task.id
          AND type = 'task_overdue'
          AND metadata->>'dueDateKey' = v_due_key
      ) THEN
        PERFORM public.create_notification(
          v_task.assigned_to, 'task_overdue', v_task.title,
          'La tarea está vencida',
          'task', v_task.id,
          jsonb_build_object(
            'taskTitle', v_task.title, 'priority', v_task.priority,
            'dueDate', v_task.due_date, 'dueDateKey', v_due_key,
            'urgencyLevel', 'critical', 'caseId', v_task.case_id
          )
        );
        v_overdue := v_overdue + 1;
      END IF;
      CONTINUE;
    END IF;

    IF NOT public.notification_enabled(v_task.assigned_to, 'task_reminder') THEN
      CONTINUE;
    END IF;

    v_intervals := CASE v_task.priority
      WHEN 'critical' THEN ARRAY[0.5, 1, 2, 4, 8, 12, 24, 48]::numeric[]
      WHEN 'urgent'   THEN ARRAY[0.5, 1, 2, 4, 8, 12, 24, 48]::numeric[]
      WHEN 'high'     THEN ARRAY[1, 4, 12, 24, 48, 72]::numeric[]
      WHEN 'medium'   THEN ARRAY[4, 24, 48, 72]::numeric[]
      ELSE                 ARRAY[24, 72, 168]::numeric[]
    END;

    SELECT min(i) INTO v_bucket FROM unnest(v_intervals) AS i WHERE i >= v_hours;
    IF v_bucket IS NULL THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE related_entity_type = 'task'
        AND related_entity_id = v_task.id
        AND type = 'task_reminder'
        AND metadata->>'dueDateKey' = v_due_key
        AND (metadata->>'interval')::numeric <= v_bucket
    ) THEN
      CONTINUE;
    END IF;

    v_urgency := CASE
      WHEN v_hours < 1 THEN 'critical'
      WHEN v_hours < 4  AND v_task.priority IN ('urgent', 'critical') THEN 'critical'
      WHEN v_hours < 12 AND v_task.priority IN ('urgent', 'critical', 'high') THEN 'high'
      WHEN v_hours < 24 THEN 'medium'
      ELSE 'low'
    END;

    v_message := CASE
      WHEN v_hours < 1 THEN 'Recordatorio: la tarea vence en ' || greatest(1, round(v_hours * 60)) || ' minutos'
      WHEN v_hours < 48 THEN 'Recordatorio: la tarea vence en ' || round(v_hours) || ' horas'
      ELSE 'Recordatorio: la tarea vence en ' || round(v_hours / 24) || ' días'
    END;

    PERFORM public.create_notification(
      v_task.assigned_to, 'task_reminder', v_task.title, v_message,
      'task', v_task.id,
      jsonb_build_object(
        'taskTitle', v_task.title, 'priority', v_task.priority,
        'dueDate', v_task.due_date, 'dueDateKey', v_due_key,
        'hoursUntilDue', round(v_hours, 2), 'urgencyLevel', v_urgency,
        'interval', v_bucket, 'caseId', v_task.case_id
      )
    );
    v_reminders := v_reminders + 1;
  END LOOP;

  RETURN jsonb_build_object('reminders', v_reminders, 'overdue', v_overdue);
END;
$$;

REVOKE ALL ON FUNCTION public.process_task_reminders() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_task_reminders() TO service_role;

-- -----------------------------------------------------------------------------
-- 4. Casos: asignación al equipo y cambio de estado
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_case_member_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_case record;
BEGIN
  BEGIN
    IF NEW.user_id IS DISTINCT FROM COALESCE(v_actor, NEW.added_by) THEN
      SELECT id, title, case_number, client_id INTO v_case
      FROM public.cases WHERE id = NEW.case_id AND deleted_at IS NULL;

      IF FOUND THEN
        PERFORM public.create_notification(
          NEW.user_id, 'case_assigned', 'Nuevo caso asignado',
          'Te sumaron al caso "' || v_case.title || '"',
          'case', v_case.id,
          jsonb_build_object(
            'caseId', v_case.id, 'caseTitle', v_case.title,
            'caseNumber', v_case.case_number, 'clientId', v_case.client_id,
            'memberRole', NEW.role
          )
        );
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_case_member_added failed for case_member %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_case_member_added() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_case_member_added ON public.case_members;
CREATE TRIGGER trg_notify_case_member_added
  AFTER INSERT ON public.case_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_case_member_added();

CREATE OR REPLACE FUNCTION public.notify_case_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_recipient uuid;
  v_metadata jsonb;
BEGIN
  BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
      RETURN NEW;
    END IF;

    v_metadata := jsonb_build_object(
      'caseId', NEW.id, 'caseTitle', NEW.title,
      'caseNumber', NEW.case_number, 'clientId', NEW.client_id,
      'status', NEW.status, 'priority', NEW.priority
    );

    -- OLD no existe en INSERT: tocarlo ahí aborta el trigger, así que cada
    -- operación va en su propia rama (mismo patrón que notify_task_change).
    IF TG_OP = 'INSERT' THEN
      IF NEW.assigned_lawyer IS NOT NULL
         AND NEW.assigned_lawyer IS DISTINCT FROM COALESCE(v_actor, NEW.created_by) THEN
        PERFORM public.create_notification(
          NEW.assigned_lawyer, 'case_assigned', 'Nuevo caso asignado',
          'Quedaste como responsable del caso "' || NEW.title || '"',
          'case', NEW.id, v_metadata
        );
      END IF;
      RETURN NEW;
    END IF;

    -- UPDATE ------------------------------------------------------------------
    IF NEW.assigned_lawyer IS NOT NULL
       AND NEW.assigned_lawyer IS DISTINCT FROM OLD.assigned_lawyer
       AND NEW.assigned_lawyer IS DISTINCT FROM v_actor THEN
      PERFORM public.create_notification(
        NEW.assigned_lawyer, 'case_assigned', 'Nuevo caso asignado',
        'Quedaste como responsable del caso "' || NEW.title || '"',
        'case', NEW.id, v_metadata
      );
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      FOR v_recipient IN SELECT recipient_id FROM public.case_recipients(NEW.id) LOOP
        IF v_recipient IS DISTINCT FROM v_actor THEN
          PERFORM public.create_notification(
            v_recipient, 'case_status_changed', 'Cambio de estado del caso',
            'El caso "' || NEW.title || '" pasó a ' || NEW.status::text,
            'case', NEW.id,
            v_metadata || jsonb_build_object('previousStatus', OLD.status)
          );
        END IF;
      END LOOP;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_case_change failed for case %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_case_change() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_case_change ON public.cases;
CREATE TRIGGER trg_notify_case_change
  AFTER INSERT OR UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_case_change();

-- -----------------------------------------------------------------------------
-- 5. Documentos subidos a un caso
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_document_uploaded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), NEW.uploaded_by);
  v_recipient uuid;
  v_case record;
BEGIN
  BEGIN
    IF NEW.deleted_at IS NOT NULL OR NEW.case_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT id, title INTO v_case
    FROM public.cases WHERE id = NEW.case_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    FOR v_recipient IN SELECT recipient_id FROM public.case_recipients(NEW.case_id) LOOP
      IF v_recipient IS DISTINCT FROM v_actor THEN
        PERFORM public.create_notification(
          v_recipient, 'document_uploaded', 'Documento nuevo',
          'Se subió "' || NEW.name || '" al caso "' || v_case.title || '"',
          'document', NEW.id,
          jsonb_build_object(
            'documentName', NEW.name, 'documentType', NEW.document_type,
            'caseId', NEW.case_id, 'caseTitle', v_case.title
          )
        );
      END IF;
    END LOOP;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_document_uploaded failed for document %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_document_uploaded() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_document_uploaded ON public.documents;
CREATE TRIGGER trg_notify_document_uploaded
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_document_uploaded();

-- -----------------------------------------------------------------------------
-- 6. Vencimientos de casos y recordatorios de agenda
-- -----------------------------------------------------------------------------
-- Misma estrategia que los recordatorios de tareas: un "bucket" de urgencia por
-- (entidad, fecha) que hace la corrida idempotente. Si el cron se atrasa el
-- aviso sale tarde, pero sale una sola vez.
CREATE OR REPLACE FUNCTION public.process_deadline_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case record;
  v_appointment record;
  v_recipient uuid;
  v_days numeric;
  v_hours numeric;
  v_bucket numeric;
  v_key text;
  v_message text;
  v_urgency text;
  v_cases int := 0;
  v_appointments int := 0;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('process_deadline_reminders')) THEN
    RETURN jsonb_build_object('skipped', true);
  END IF;

  -- Casos con fecha de cierre a la vista ---------------------------------------
  FOR v_case IN
    SELECT id, title, case_number, client_id, end_date, priority::text AS priority
    FROM public.cases
    WHERE deleted_at IS NULL
      AND end_date IS NOT NULL
      AND status NOT IN ('closed', 'archived')
      AND end_date BETWEEN current_date - 7 AND current_date + 7
  LOOP
    v_days := v_case.end_date - current_date;
    v_key := v_case.end_date::text;

    IF v_days < 0 THEN
      v_bucket := -1;
      v_urgency := 'critical';
      v_message := 'El plazo del caso venció el ' || to_char(v_case.end_date, 'DD/MM/YYYY');
    ELSE
      SELECT min(i) INTO v_bucket
      FROM unnest(ARRAY[0, 1, 3, 7]::numeric[]) AS i
      WHERE i >= v_days;

      IF v_bucket IS NULL THEN
        CONTINUE;
      END IF;

      v_urgency := CASE
        WHEN v_days <= 0 THEN 'critical'
        WHEN v_days <= 1 THEN 'high'
        WHEN v_days <= 3 THEN 'medium'
        ELSE 'low'
      END;

      v_message := CASE
        WHEN v_days = 0 THEN 'El plazo del caso vence hoy'
        WHEN v_days = 1 THEN 'El plazo del caso vence mañana'
        ELSE 'El plazo del caso vence en ' || round(v_days) || ' días'
      END;
    END IF;

    FOR v_recipient IN SELECT recipient_id FROM public.case_recipients(v_case.id) LOOP
      IF public.notification_enabled(v_recipient, 'case_deadline')
         AND NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = v_recipient
          AND related_entity_type = 'case'
          AND related_entity_id = v_case.id
          AND type = 'case_deadline'
          AND metadata->>'dueDateKey' = v_key
          AND (metadata->>'interval')::numeric <= v_bucket
      ) THEN
        PERFORM public.create_notification(
          v_recipient, 'case_deadline', v_case.title, v_message,
          'case', v_case.id,
          jsonb_build_object(
            'caseId', v_case.id, 'caseTitle', v_case.title,
            'caseNumber', v_case.case_number, 'clientId', v_case.client_id,
            'priority', v_case.priority, 'dueDate', v_case.end_date,
            'dueDateKey', v_key, 'interval', v_bucket, 'urgencyLevel', v_urgency
          )
        );
        v_cases := v_cases + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- Agenda: aviso un día antes y una hora antes ---------------------------------
  FOR v_appointment IN
    SELECT id, title, start_time, assigned_to, case_id, client_id, location, meeting_type
    FROM public.appointments
    WHERE deleted_at IS NULL
      AND assigned_to IS NOT NULL
      AND status NOT IN ('cancelled', 'completed', 'no_show')
      AND start_time BETWEEN now() AND now() + interval '48 hours'
  LOOP
    v_hours := extract(epoch FROM (v_appointment.start_time - now())) / 3600.0;
    v_key := v_appointment.start_time::text;

    SELECT min(i) INTO v_bucket
    FROM unnest(ARRAY[1, 24]::numeric[]) AS i
    WHERE i >= v_hours;

    IF v_bucket IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT public.notification_enabled(v_appointment.assigned_to, 'appointment_reminder') THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_appointment.assigned_to
        AND related_entity_type = 'appointment'
        AND related_entity_id = v_appointment.id
        AND type = 'appointment_reminder'
        AND metadata->>'dueDateKey' = v_key
        AND (metadata->>'interval')::numeric <= v_bucket
    ) THEN
      CONTINUE;
    END IF;

    v_message := CASE
      WHEN v_hours < 1 THEN 'Comienza en ' || greatest(1, round(v_hours * 60)) || ' minutos'
      ELSE 'Comienza en ' || round(v_hours) || ' horas'
    END;

    IF v_appointment.location IS NOT NULL THEN
      v_message := v_message || ' · ' || v_appointment.location;
    END IF;

    PERFORM public.create_notification(
      v_appointment.assigned_to, 'appointment_reminder', v_appointment.title, v_message,
      'appointment', v_appointment.id,
      jsonb_build_object(
        'startTime', v_appointment.start_time, 'dueDate', v_appointment.start_time,
        'dueDateKey', v_key, 'interval', v_bucket,
        'urgencyLevel', CASE WHEN v_hours < 1 THEN 'critical' ELSE 'medium' END,
        'caseId', v_appointment.case_id, 'clientId', v_appointment.client_id,
        'location', v_appointment.location, 'meetingType', v_appointment.meeting_type
      )
    );
    v_appointments := v_appointments + 1;
  END LOOP;

  RETURN jsonb_build_object('cases', v_cases, 'appointments', v_appointments);
END;
$$;

REVOKE ALL ON FUNCTION public.process_deadline_reminders() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_deadline_reminders() TO service_role;

-- -----------------------------------------------------------------------------
-- 7. pg_cron
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  v_job record;
BEGIN
  FOR v_job IN
    SELECT jobid FROM cron.job WHERE jobname = 'process-deadline-reminders'
  LOOP
    PERFORM cron.unschedule(v_job.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'process-deadline-reminders',
  '*/15 * * * *',
  $$SELECT public.process_deadline_reminders()$$
);

-- -----------------------------------------------------------------------------
-- 8. Realtime para que el panel refleje cambios entre pestañas
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notification_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_preferences;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 9. Verificación
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE '✅ notification_preferences creada con RLS por usuario';
  RAISE NOTICE '✅ create_notification() es ahora el único punto de inserción (respeta preferencias)';
  RAISE NOTICE '✅ Triggers: tareas, case_members, cases (asignación + estado), documents';
  RAISE NOTICE '✅ process_deadline_reminders() programada cada 15 minutos';
  RAISE NOTICE 'ℹ️  Prueba manual: SELECT public.process_deadline_reminders();';
END $$;
