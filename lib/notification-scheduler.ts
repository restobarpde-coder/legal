import { createServiceClient } from '@/lib/supabase/server'

// Los recordatorios de tareas viven en la base de datos
// (public.process_task_reminders, ver sql/20-notifications-reliability.sql):
// son idempotentes por (tarea, due_date, umbral) y pg_cron los ejecuta cada
// 5 minutos. Este wrapper permite dispararlos también desde Vercel
// (/api/notifications/check) como respaldo.
export async function checkAndSendNotifications() {
  const supabase = createServiceClient()

  const [tasks, deadlines] = await Promise.all([
    supabase.rpc('process_task_reminders'),
    supabase.rpc('process_deadline_reminders'),
  ])

  // Un fallo en una rama no debe tapar el resultado de la otra: se reportan
  // juntos para que el endpoint devuelva el error completo.
  const failures = [
    tasks.error && `process_task_reminders: ${tasks.error.message}`,
    deadlines.error && `process_deadline_reminders: ${deadlines.error.message}`,
  ].filter(Boolean)

  if (failures.length > 0) {
    console.error('Error ejecutando recordatorios:', failures.join(' | '))
    throw new Error(failures.join(' | '))
  }

  return {
    ...(tasks.data as { reminders?: number; overdue?: number; skipped?: boolean }),
    deadlines: deadlines.data as { cases?: number; appointments?: number; skipped?: boolean },
  }
}
