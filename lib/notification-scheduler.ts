import { createServiceClient } from '@/lib/supabase/server'

// Los recordatorios de tareas viven en la base de datos
// (public.process_task_reminders, ver sql/20-notifications-reliability.sql):
// son idempotentes por (tarea, due_date, umbral) y pg_cron los ejecuta cada
// 5 minutos. Este wrapper permite dispararlos también desde Vercel
// (/api/notifications/check) como respaldo.
export async function checkAndSendNotifications() {
  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('process_task_reminders')

  if (error) {
    console.error('Error ejecutando process_task_reminders:', error)
    throw new Error(`process_task_reminders falló: ${error.message}`)
  }

  return data as { reminders?: number; overdue?: number; skipped?: boolean }
}
