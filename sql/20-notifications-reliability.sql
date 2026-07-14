-- =============================================================================
-- 🚀 MIGRATION: 20-notifications-reliability.sql
-- =============================================================================
-- Hace confiable el sistema de notificaciones:
--
-- 1. Trigger en `tasks`: crea notificaciones de asignación / cambio de fecha /
--    completado directamente en la base. Cubre TODOS los caminos de escritura
--    (API routes y también los inserts directos del cliente, que hoy no
--    generaban notificación).
-- 2. `process_task_reminders()`: recordatorios de vencimiento idempotentes por
--    "bucket" de urgencia. No depende de ejecutarse en una ventana exacta de
--    ±5 minutos como el scheduler anterior: si el cron se atrasa, el
--    recordatorio sale tarde pero sale, y nunca se duplica.
-- 3. pg_cron: ejecuta los recordatorios cada 5 minutos dentro de Supabase
--    (independiente del plan de Vercel) y limpia notificaciones viejas a diario.
--
-- Ejecutar en el SQL Editor de Supabase con el rol postgres.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Índice para los chequeos de duplicados por entidad
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS notifications_entity_idx
  ON public.notifications (related_entity_type, related_entity_id, type);

-- -----------------------------------------------------------------------------
-- 1. Trigger: notificaciones por cambios en tareas
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
BEGIN
  -- Nunca bloquear la escritura de la tarea por un problema de notificación.
  BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
      RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
      IF NEW.assigned_to IS NOT NULL
         AND NEW.assigned_to IS DISTINCT FROM COALESCE(v_actor, NEW.created_by) THEN
        INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, metadata)
        VALUES (
          NEW.assigned_to, 'task_assigned', 'Nueva tarea asignada',
          'Se te ha asignado la tarea "' || NEW.title || '"',
          'task', NEW.id,
          jsonb_build_object('taskTitle', NEW.title, 'priority', NEW.priority, 'caseId', NEW.case_id, 'dueDate', NEW.due_date)
        );
      END IF;
      RETURN NEW;
    END IF;

    -- UPDATE ------------------------------------------------------------------
    IF NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       AND NEW.assigned_to IS DISTINCT FROM v_actor THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, metadata)
      VALUES (
        NEW.assigned_to, 'task_assigned', 'Nueva tarea asignada',
        'Se te ha asignado la tarea "' || NEW.title || '"',
        'task', NEW.id,
        jsonb_build_object('taskTitle', NEW.title, 'priority', NEW.priority, 'caseId', NEW.case_id, 'dueDate', NEW.due_date)
      );
    ELSIF NEW.due_date IS DISTINCT FROM OLD.due_date
       AND NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM v_actor THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, metadata)
      VALUES (
        NEW.assigned_to, 'task_updated', 'Actualización de tarea',
        'La fecha de vencimiento de "' || NEW.title || '" ha cambiado',
        'task', NEW.id,
        jsonb_build_object('taskTitle', NEW.title, 'priority', NEW.priority, 'caseId', NEW.case_id, 'dueDate', NEW.due_date)
      );
    END IF;

    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
      FOR v_recipient IN
        SELECT DISTINCT u FROM unnest(ARRAY[NEW.created_by, NEW.assigned_to]) AS u
        WHERE u IS NOT NULL AND u IS DISTINCT FROM v_actor
      LOOP
        INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, metadata)
        VALUES (
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

-- -----------------------------------------------------------------------------
-- 2. Recordatorios de vencimiento (idempotentes, sin ventana exacta)
-- -----------------------------------------------------------------------------
-- Por prioridad se define una escalera de umbrales (horas antes del
-- vencimiento). En cada corrida se toma el umbral más chico ya alcanzado y se
-- notifica una sola vez por (tarea, due_date, umbral). Si el cron se saltea
-- corridas, solo se envía el umbral vigente (sin inundar con los perdidos).
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
  -- Evitar corridas superpuestas si una ejecución se demora
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

    -- Tarea vencida: una única notificación por (tarea, due_date)
    IF v_hours < 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE related_entity_type = 'task'
          AND related_entity_id = v_task.id
          AND type = 'task_overdue'
          AND metadata->>'dueDateKey' = v_due_key
      ) THEN
        INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, metadata)
        VALUES (
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

    v_intervals := CASE v_task.priority
      WHEN 'critical' THEN ARRAY[0.5, 1, 2, 4, 8, 12, 24, 48]::numeric[]
      WHEN 'urgent'   THEN ARRAY[0.5, 1, 2, 4, 8, 12, 24, 48]::numeric[]
      WHEN 'high'     THEN ARRAY[1, 4, 12, 24, 48, 72]::numeric[]
      WHEN 'medium'   THEN ARRAY[4, 24, 48, 72]::numeric[]
      ELSE                 ARRAY[24, 72, 168]::numeric[]
    END;

    -- Umbral más urgente ya alcanzado
    SELECT min(i) INTO v_bucket FROM unnest(v_intervals) AS i WHERE i >= v_hours;
    IF v_bucket IS NULL THEN
      CONTINUE; -- todavía no llegó al primer umbral
    END IF;

    -- Ya se envió este umbral (u otro más urgente) para esta fecha de vencimiento
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

    INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, metadata)
    VALUES (
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
-- 3. pg_cron: recordatorios cada 5 minutos + limpieza diaria
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Reprogramar de forma idempotente
DO $$
DECLARE
  v_job record;
BEGIN
  FOR v_job IN SELECT jobid FROM cron.job WHERE jobname IN ('process-task-reminders', 'cleanup-notifications') LOOP
    PERFORM cron.unschedule(v_job.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'process-task-reminders',
  '*/5 * * * *',
  $$SELECT public.process_task_reminders()$$
);

SELECT cron.schedule(
  'cleanup-notifications',
  '30 3 * * *',
  $$DELETE FROM public.notifications
    WHERE (dismissed_at IS NOT NULL AND dismissed_at < now() - interval '30 days')
       OR created_at < now() - interval '90 days'$$
);

-- -----------------------------------------------------------------------------
-- 4. Verificación
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger trg_notify_task_change instalado en public.tasks';
  RAISE NOTICE '✅ process_task_reminders() creada (corrida de prueba: SELECT public.process_task_reminders();)';
  RAISE NOTICE '✅ pg_cron: process-task-reminders (*/5 min) y cleanup-notifications (03:30) programados';
  RAISE NOTICE 'ℹ️  Ver jobs: SELECT jobid, jobname, schedule FROM cron.job;';
  RAISE NOTICE 'ℹ️  Ver corridas: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;';
END $$;
