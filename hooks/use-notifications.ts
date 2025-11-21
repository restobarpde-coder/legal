'use client'

import { useEffect, useState } from 'react'

export type Notification = {
  id?: string
  type: 'task_reminder' | 'task' | 'event' | 'connected' | 'ping'
  title?: string
  dueDate?: string
  caseId?: string | null
  // Campos adicionales para notificaciones en tiempo real
  taskId?: string
  taskTitle?: string
  taskDescription?: string | null
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  hoursUntilDue?: number
  urgencyLevel?: 'critical' | 'high' | 'medium' | 'low'
  message?: string
}

// Hook para notificaciones en tiempo real con SSE
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout

    const connect = () => {
      try {
        // Conectar al stream SSE
        eventSource = new EventSource('/api/notifications/stream')

        eventSource.onopen = () => {
          console.log('🔔 Conectado al servidor de notificaciones')
          setIsConnected(true)
          setIsLoading(false)
          setError(null)
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as Notification

            // Ignorar pings y mensajes de conexión
            if (data.type === 'ping' || data.type === 'connected') {
              return
            }

            // Agregar notificación de tarea
            if (data.type === 'task_reminder') {
              setNotifications(prev => {
                // Evitar duplicados basados en taskId
                const exists = prev.some(n => 
                  n.type === 'task_reminder' && n.taskId === data.taskId
                )
                
                if (exists) {
                  // Actualizar notificación existente
                  return prev.map(n => 
                    n.type === 'task_reminder' && n.taskId === data.taskId ? data : n
                  )
                }
                
                // Agregar nueva notificación
                return [...prev, data]
              })

              // Mostrar notificación del navegador si está permitido
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(data.taskTitle || 'Recordatorio de tarea', {
                  body: `Vence en ${Math.round(data.hoursUntilDue || 0)} horas`,
                  icon: '/favicon.ico',
                  tag: data.taskId, // Evita duplicados
                })
              }
            }
          } catch (err) {
            console.error('Error procesando notificación:', err)
          }
        }

        eventSource.onerror = (err) => {
          console.error('❌ Error en SSE:', err)
          setIsConnected(false)
          setError(new Error('Error de conexión'))
          eventSource?.close()

          // Reconectar después de 5 segundos
          reconnectTimeout = setTimeout(() => {
            console.log('🔄 Reconectando...')
            connect()
          }, 5000)
        }
      } catch (err) {
        console.error('Error al conectar SSE:', err)
        setError(err as Error)
        setIsLoading(false)
      }
    }

    // Cargar notificaciones iniciales del API tradicional
    const loadInitialNotifications = async () => {
      try {
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const data = await response.json()
          setNotifications(data.notifications || [])
        }
      } catch (err) {
        console.error('Error cargando notificaciones iniciales:', err)
      }
    }

    // Pedir permiso para notificaciones del navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    loadInitialNotifications()
    connect()

    // Cleanup
    return () => {
      if (eventSource) {
        eventSource.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [])

  // Función para marcar notificación como leída
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => 
      n.type === 'task_reminder' ? n.taskId !== notificationId : n.id !== notificationId
    ))
  }

  // Función para limpiar todas las notificaciones
  const clearAll = () => {
    setNotifications([])
  }

  return {
    data: notifications,
    isLoading,
    error,
    isConnected,
    markAsRead,
    clearAll
  }
}
