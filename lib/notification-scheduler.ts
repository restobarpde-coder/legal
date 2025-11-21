import { createServiceClient } from '@/lib/supabase/server'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

// Configuración de intervalos de notificación según prioridad (en horas antes del vencimiento)
const NOTIFICATION_INTERVALS = {
  urgent: [0.5, 1, 2, 4, 8, 12, 24, 48], // Notifica cada 30min en la última hora, cada hora hasta 12h, luego cada 12h
  high: [1, 4, 12, 24, 48, 72],          // Notifica cada hora en las últimas 4h, luego cada 12h hasta 3 días antes
  medium: [4, 24, 48, 72],                // Notifica 4h antes, 1 día antes, 2 días antes, 3 días antes
  low: [24, 72, 168]                      // Notifica 1 día antes, 3 días antes, 1 semana antes
}

interface TaskNotification {
  id: string
  title: string
  description: string | null
  priority: TaskPriority
  due_date: string
  assigned_to: string | null
  case_id: string | null
  status: string
}

interface NotificationPayload {
  type: 'task_reminder'
  taskId: string
  taskTitle: string
  taskDescription: string | null
  priority: TaskPriority
  dueDate: string
  caseId: string | null
  hoursUntilDue: number
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low'
}

// Calcular horas hasta el vencimiento
function hoursUntilDue(dueDate: string): number {
  const now = new Date()
  const due = new Date(dueDate)
  return (due.getTime() - now.getTime()) / (1000 * 60 * 60)
}

// Determinar si se debe enviar notificación según prioridad y tiempo restante
function shouldNotify(task: TaskNotification): boolean {
  const hours = hoursUntilDue(task.due_date)

  // No notificar si ya venció (pero sí si vence en menos de 30 min)
  if (hours < -0.5) return false

  // No notificar si está completada o cancelada
  if (task.status === 'completed' || task.status === 'cancelled') return false

  const intervals = NOTIFICATION_INTERVALS[task.priority]

  // Verificar si estamos cerca de alguno de los intervalos de notificación
  // Con un margen de 5 minutos (0.083 horas)
  return intervals.some(interval => {
    const diff = Math.abs(hours - interval)
    return diff < 0.083
  })
}

// Determinar nivel de urgencia para la UI
function getUrgencyLevel(hours: number, priority: TaskPriority): 'critical' | 'high' | 'medium' | 'low' {
  if (hours < 1) return 'critical'
  if (hours < 4 && priority === 'urgent') return 'critical'
  if (hours < 12 && (priority === 'urgent' || priority === 'high')) return 'high'
  if (hours < 24) return 'medium'
  return 'low'
}

// Obtener tareas que requieren notificación
export async function getTasksForNotification(): Promise<TaskNotification[]> {
  const supabase = createServiceClient()

  // Obtener tareas con fecha de vencimiento próxima (próxima semana)
  const now = new Date()
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, description, priority, due_date, assigned_to, case_id, status')
    .not('status', 'in', '(completed,cancelled)')
    .not('assigned_to', 'is', null)
    .gte('due_date', now.toISOString())
    .lte('due_date', oneWeekFromNow.toISOString())
    .is('deleted_at', null)

  if (error) {
    console.error('Error obteniendo tareas para notificación:', error)
    return []
  }

  return (tasks as TaskNotification[]).filter(task => shouldNotify(task))
}

// Crear payload de notificación
export function createNotificationPayload(task: TaskNotification): NotificationPayload {
  const hours = hoursUntilDue(task.due_date)

  return {
    type: 'task_reminder',
    taskId: task.id,
    taskTitle: task.title,
    taskDescription: task.description,
    priority: task.priority,
    dueDate: task.due_date,
    caseId: task.case_id,
    hoursUntilDue: Math.max(0, hours),
    urgencyLevel: getUrgencyLevel(hours, task.priority)
  }
}

// Función principal del scheduler
// Función principal del scheduler
export async function checkAndSendNotifications() {
  const supabase = createServiceClient()

  try {
    const tasks = await getTasksForNotification()

    console.log(`📅 Scheduler: Revisando ${tasks.length} tareas para notificación`)

    let sentCount = 0
    for (const task of tasks) {
      if (task.assigned_to) {
        const notification = createNotificationPayload(task)

        // Insertar en la base de datos
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: task.assigned_to,
            type: 'task_reminder',
            title: notification.taskTitle, // Using task title as notification title for reminders
            message: `Recordatorio: La tarea vence en ${Math.round(notification.hoursUntilDue)} horas`,
            related_entity_type: 'task',
            related_entity_id: task.id,
            metadata: {
              priority: task.priority,
              dueDate: task.due_date,
              hoursUntilDue: notification.hoursUntilDue,
              urgencyLevel: notification.urgencyLevel
            }
          })

        if (!error) {
          sentCount++

          // Send Broadcast message for real-time delivery
          const channelName = `user-notifications-${task.assigned_to}`
          const status = await supabase
            .channel(channelName)
            .send({
              type: 'broadcast',
              event: 'new-notification',
              payload: {
                id: 'generated-id', // Ideally we should get the real ID, but for now this ensures the UI updates
                ...notification,
                user_id: task.assigned_to,
                created_at: new Date().toISOString(),
                read_at: null,
                dismissed_at: null
              }
            })

          if (status !== 'ok') console.error('❌ Error sending broadcast for reminder, status:', status)
        } else {
          console.error('Error inserting notification:', error)
        }
      }
    }

    console.log(`✉️ Scheduler: Creadas ${sentCount} notificaciones`)
    return { total: tasks.length, sent: sentCount }
  } catch (error) {
    console.error('Error en scheduler de notificaciones:', error)
    return { total: 0, sent: 0, error }
  }
}
