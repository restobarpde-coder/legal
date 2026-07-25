/**
 * Catálogo único de notificaciones del estudio.
 *
 * Es la fuente de verdad compartida por el panel de configuración, la API de
 * preferencias y el dropdown de la campana. La base de datos no replica este
 * catálogo: `notification_preferences` solo guarda las filas que el usuario
 * modificó, y la ausencia de fila significa "usar el default de acá".
 */

export type NotificationTypeId =
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'task_reminder'
  | 'task_overdue'
  | 'case_assigned'
  | 'case_status_changed'
  | 'case_deadline'
  | 'appointment_reminder'
  | 'document_uploaded'
  | 'inbox_email'
  | 'inbox_whatsapp'

export type NotificationGroupId = 'tasks' | 'cases' | 'agenda' | 'documents' | 'messages'

export type NotificationTypeDefinition = {
  id: NotificationTypeId
  group: NotificationGroupId
  label: string
  description: string
  /** Aparece en la campana. */
  defaultEnabled: boolean
  /** Además dispara notificación nativa del sistema con la pestaña en segundo plano. */
  defaultPush: boolean
}

export type NotificationGroupDefinition = {
  id: NotificationGroupId
  label: string
  description: string
}

export const NOTIFICATION_GROUPS: NotificationGroupDefinition[] = [
  {
    id: 'tasks',
    label: 'Tareas',
    description: 'Asignaciones, recordatorios y vencimientos de tus tareas.',
  },
  {
    id: 'cases',
    label: 'Casos',
    description: 'Cambios en los expedientes en los que participás.',
  },
  {
    id: 'agenda',
    label: 'Agenda',
    description: 'Audiencias y reuniones próximas.',
  },
  {
    id: 'documents',
    label: 'Documentos',
    description: 'Archivos nuevos en tus casos.',
  },
  {
    id: 'messages',
    label: 'Mensajes',
    description: 'Correo y WhatsApp que entran al inbox del estudio.',
  },
]

export const NOTIFICATION_TYPES: NotificationTypeDefinition[] = [
  {
    id: 'task_assigned',
    group: 'tasks',
    label: 'Tarea asignada',
    description: 'Alguien te asigna una tarea.',
    defaultEnabled: true,
    defaultPush: true,
  },
  {
    id: 'task_reminder',
    group: 'tasks',
    label: 'Recordatorio de vencimiento',
    description: 'Aviso escalonado a medida que se acerca la fecha límite.',
    defaultEnabled: true,
    defaultPush: true,
  },
  {
    id: 'task_overdue',
    group: 'tasks',
    label: 'Tarea vencida',
    description: 'Una tarea tuya pasó su fecha de vencimiento.',
    defaultEnabled: true,
    defaultPush: true,
  },
  {
    id: 'task_updated',
    group: 'tasks',
    label: 'Cambio de fecha',
    description: 'Se modifica el vencimiento de una tarea tuya.',
    defaultEnabled: true,
    defaultPush: false,
  },
  {
    id: 'task_completed',
    group: 'tasks',
    label: 'Tarea completada',
    description: 'Se completa una tarea que creaste o tenías asignada.',
    defaultEnabled: true,
    defaultPush: false,
  },
  {
    id: 'case_assigned',
    group: 'cases',
    label: 'Asignación a un caso',
    description: 'Te suman al equipo de un expediente o quedás como abogado responsable.',
    defaultEnabled: true,
    defaultPush: true,
  },
  {
    id: 'case_deadline',
    group: 'cases',
    label: 'Vencimiento de caso',
    description: 'La fecha de cierre del expediente está próxima o ya pasó.',
    defaultEnabled: true,
    defaultPush: true,
  },
  {
    id: 'case_status_changed',
    group: 'cases',
    label: 'Cambio de estado',
    description: 'Un caso tuyo cambia de estado (abierto, cerrado, archivado).',
    defaultEnabled: true,
    defaultPush: false,
  },
  {
    id: 'appointment_reminder',
    group: 'agenda',
    label: 'Audiencia o reunión próxima',
    description: 'Recordatorio antes de cada evento de tu agenda.',
    defaultEnabled: true,
    defaultPush: true,
  },
  {
    id: 'document_uploaded',
    group: 'documents',
    label: 'Documento nuevo',
    description: 'Se sube un archivo a un caso en el que participás.',
    defaultEnabled: true,
    defaultPush: false,
  },
  {
    id: 'inbox_email',
    group: 'messages',
    label: 'Correo entrante',
    description: 'Llega un email a tu casilla o a la casilla compartida.',
    defaultEnabled: true,
    defaultPush: true,
  },
  {
    id: 'inbox_whatsapp',
    group: 'messages',
    label: 'WhatsApp entrante',
    description: 'Llega un mensaje de WhatsApp al inbox del estudio.',
    defaultEnabled: true,
    defaultPush: true,
  },
]

export const NOTIFICATION_TYPE_IDS = NOTIFICATION_TYPES.map(type => type.id)

const TYPES_BY_ID = new Map(NOTIFICATION_TYPES.map(type => [type.id, type]))

export function isNotificationTypeId(value: string): value is NotificationTypeId {
  return TYPES_BY_ID.has(value as NotificationTypeId)
}

export function getNotificationType(id: string): NotificationTypeDefinition | undefined {
  return TYPES_BY_ID.get(id as NotificationTypeId)
}

export type NotificationPreference = {
  type: NotificationTypeId
  enabled: boolean
  push: boolean
}

/**
 * El panel de configuración lo emite tras guardar para que el provider de
 * notificaciones recargue los flags de push sin esperar a un refresh.
 */
export const NOTIFICATION_PREFERENCES_CHANGED_EVENT = 'notification-preferences-changed'

/** Preferencias completas del catálogo, con los defaults ya aplicados. */
export function defaultPreferences(): NotificationPreference[] {
  return NOTIFICATION_TYPES.map(type => ({
    type: type.id,
    enabled: type.defaultEnabled,
    push: type.defaultPush,
  }))
}

/**
 * Combina las filas guardadas con los defaults del catálogo. Las filas de tipos
 * que ya no existen se descartan, así el panel nunca muestra tipos fantasma.
 */
export function mergePreferences(
  stored: Array<{ type: string; enabled: boolean; push: boolean }>,
): NotificationPreference[] {
  const overrides = new Map(stored.map(row => [row.type, row]))
  return NOTIFICATION_TYPES.map(type => {
    const override = overrides.get(type.id)
    return {
      type: type.id,
      enabled: override?.enabled ?? type.defaultEnabled,
      push: override?.push ?? type.defaultPush,
    }
  })
}

/**
 * Tipos legacy que siguen existiendo en filas ya creadas. Se mapean al tipo
 * actual para que las preferencias y los íconos funcionen sin migrar datos.
 */
const LEGACY_TYPE_ALIASES: Record<string, NotificationTypeId> = {
  inbox_message: 'inbox_email',
}

export function resolveNotificationType(type: string, channel?: string): NotificationTypeId | undefined {
  if (isNotificationTypeId(type)) return type
  if (type === 'inbox_message') {
    return channel === 'whatsapp' ? 'inbox_whatsapp' : 'inbox_email'
  }
  return LEGACY_TYPE_ALIASES[type]
}
