'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, CheckSquare, Clock, AlertTriangle, X } from 'lucide-react'
import { useNotifications, type Notification } from '@/hooks/use-notifications'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

// Obtener color según prioridad y urgencia
function getUrgencyColor(notification: Notification) {
  if (notification.urgencyLevel === 'critical') return 'bg-red-500'
  if (notification.urgencyLevel === 'high' || notification.priority === 'urgent') return 'bg-orange-500'
  if (notification.urgencyLevel === 'medium' || notification.priority === 'high') return 'bg-yellow-500'
  return 'bg-blue-500'
}

function getPriorityLabel(priority?: string) {
  const labels: Record<string, string> = {
    urgent: 'Urgente',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja'
  }
  return labels[priority || 'medium'] || 'Media'
}

function formatTimeUntilDue(hours: number) {
  if (hours <= 0) return 'Ahora'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} minutos`
  if (hours < 24) return `${Math.round(hours)} horas`
  const days = Math.round(hours / 24)
  return `${days} ${days === 1 ? 'día' : 'días'}`
}

// "Vence en…" calculado en vivo desde metadata.dueDate; el hoursUntilDue
// guardado al crear la notificación queda obsoleto con el paso del tiempo.
function dueLabel(notification: Notification) {
  const dueDate = notification.metadata?.dueDate
  if (!dueDate) return null
  const hours = (new Date(dueDate).getTime() - Date.now()) / 3_600_000
  if (Number.isNaN(hours)) return null
  return hours < 0
    ? `Venció ${formatDistanceToNow(new Date(dueDate), { addSuffix: true, locale: es })}`
    : `Vence en ${formatTimeUntilDue(hours)}`
}

function isTaskNotification(notification: Notification) {
  return notification.related_entity_type === 'task' || !!notification.task_id
}

// Casos y agenda también guardan `metadata.dueDate`, así que muestran el mismo
// "vence en…" en vivo que las tareas.
function hasDeadline(notification: Notification) {
  return isTaskNotification(notification)
    || notification.type === 'case_deadline'
    || notification.type === 'appointment_reminder'
}

/** Destino de la notificación, de lo más específico a lo más general. */
function notificationLink(notification: Notification) {
  const entityId = notification.related_entity_id
  const caseId = notification.metadata?.caseId

  switch (notification.related_entity_type) {
    case 'task':
      if (entityId) return `/dashboard/tasks/${entityId}`
      break
    case 'case':
      if (entityId) return `/dashboard/cases/${entityId}`
      break
    case 'appointment':
      return '/dashboard/calendar'
    case 'document':
      return caseId ? `/dashboard/cases/${caseId}` : '/dashboard/documents'
    case 'inbox_conversation':
      if (entityId) return `/dashboard/messages?conversation=${entityId}`
      break
    case 'inbox_message':
      if (notification.metadata?.conversation_id) {
        return `/dashboard/messages?conversation=${notification.metadata.conversation_id}`
      }
      break
  }

  if (notification.task_id) return `/dashboard/tasks/${notification.task_id}`
  if (notification.case_id) return `/dashboard/cases/${notification.case_id}`
  if (caseId) return `/dashboard/cases/${caseId}`
  return '#'
}

/** Etiqueta corta a la derecha del título. */
function notificationBadge(notification: Notification) {
  if (isTaskNotification(notification)) return getPriorityLabel(notification.priority)

  switch (notification.type) {
    case 'inbox_whatsapp':
      return 'WhatsApp'
    case 'inbox_email':
      return 'Email'
    case 'inbox_message':
      return notification.metadata?.channel === 'whatsapp' ? 'WhatsApp' : 'Email'
    case 'case_assigned':
    case 'case_status_changed':
      return 'Caso'
    case 'case_deadline':
      return 'Vencimiento'
    case 'appointment_reminder':
      return 'Agenda'
    case 'document_uploaded':
      return 'Documento'
    default:
      return null
  }
}

export function NotificationDropdown() {
  const { data: notifications, isLoading, error, isConnected, dismissNotification, clearAll } = useNotifications()
  const router = useRouter()

  const unreadCount = notifications?.length || 0

  return (
    <DropdownMenu onOpenChange={(open) => {
      // Pedir permiso para notificaciones nativas recién ante un gesto del
      // usuario; los navegadores penalizan pedirlo automáticamente al cargar.
      if (open && 'Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission()
      }
    }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {isConnected && (
            <span className="absolute bottom-0 right-0 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-1rem))]">
        <div className="flex items-center justify-between">
          <DropdownMenuLabel className="flex items-center gap-2">
            Notificaciones
            {!isConnected && <span className="text-xs text-muted-foreground">(desconectado)</span>}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault()
                clearAll()
              }}
            >
              Limpiar todo
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <DropdownMenuItem disabled>
              <Clock className="h-4 w-4 mr-2" />
              Cargando...
            </DropdownMenuItem>
          ) : error ? (
            <DropdownMenuItem disabled>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Error al cargar
            </DropdownMenuItem>
          ) : notifications && notifications.length > 0 ? (
            notifications.map((notification) => {
              const notificationId = notification.id
              const title = notification.taskTitle || notification.title || 'Notificación'
              const description = notification.taskDescription || notification.message || ''
              const due = hasDeadline(notification) ? dueLabel(notification) : null
              const badge = notificationBadge(notification)
              const link = notificationLink(notification)

              return (
                <div key={notificationId} className="relative group">
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={link} className="block" onClick={(event) => {
                      if (link === '#') return
                      event.preventDefault()
                      // Navegar de inmediato; marcar como leída en segundo plano.
                      void dismissNotification(notificationId)
                      router.push(link)
                    }}>
                      <div className="flex items-start gap-3 py-2">
                        <div className={`h-2 w-2 rounded-full mt-2 ${getUrgencyColor(notification)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm line-clamp-1">{title}</p>
                            {badge && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {badge}
                              </Badge>
                            )}
                          </div>
                          {description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              {due ?? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      dismissNotification(notificationId)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )
            })
          ) : (
            <DropdownMenuItem disabled>
              <CheckSquare className="h-4 w-4 mr-2" />
              No hay notificaciones
            </DropdownMenuItem>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
