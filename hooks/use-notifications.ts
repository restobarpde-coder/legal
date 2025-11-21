'use client'

import { useEffect, useState } from 'react'

export type Notification = {
  id: string // Notifications from DB will always have an ID
  user_id?: string // Optional, as it's the current user
  type: string // Can be any string from the database for now
  title: string
  message?: string
  createdAt: string
  readAt?: string | null // ISO string date
  dismissedAt?: string | null // ISO string date
  // Related entity details
  caseId?: string | null
  taskId?: string | null
  // Additional fields from stream that might not be in DB for initial load
  taskTitle?: string
  taskDescription?: string | null
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  hoursUntilDue?: number
  urgencyLevel?: 'critical' | 'high' | 'medium' | 'low'
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
            const data = JSON.parse(event.data) as Notification;

            // Ignore pings and connection messages
            if (data.type === 'ping' || data.type === 'connected') {
              return;
            }

            // Update local state with the new notification
            setNotifications(prev => {
              // Check if notification with the same ID already exists (e.g., an update)
              const existingNotificationIndex = prev.findIndex(n => n.id === data.id);

              if (existingNotificationIndex > -1) {
                // Update existing notification
                return prev.map((n, index) =>
                  index === existingNotificationIndex ? { ...n, ...data } : n
                );
              } else {
                // Add new notification, making sure it's not dismissed
                if (!data.dismissedAt) {
                  return [data, ...prev]; // Add new notification to the top
                }
              }
              return prev;
            });

            // Show browser notification if permitted and it's a new or significant event
            if (data.type !== 'task_reminder' && data.type !== 'task') { // Only show for non-task events
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(data.title || 'Nueva Notificación', {
                  body: data.message || '',
                  icon: '/favicon.ico',
                  tag: data.id, // Avoid duplicates
                });
              }
            } else if (data.type === 'task_reminder' && !data.readAt) { // For task reminders, if not read
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(data.title || 'Recordatorio de Tarea', {
                  body: data.message || `Vence en ${Math.round(data.hoursUntilDue || 0)} horas`,
                  icon: '/favicon.ico',
                  tag: data.id, // Avoid duplicates
                });
              }
            }
          } catch (err) {
            console.error('Error procesando notificación:', err);
          }
        };

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
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n =>
          n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
        ));
      } else {
        console.error('Failed to mark notification as read:', await response.text());
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Función para descartar una notificación (la elimina de la vista)
  const dismissNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/dismiss`, {
        method: 'PUT',
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      } else {
        console.error('Failed to dismiss notification:', await response.text());
      }
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  };

  // Función para descartar todas las notificaciones visibles
  const dismissAll = async () => {
    try {
      // Create an array of promises for dismissing each visible notification
      const dismissPromises = notifications.map(n => 
        fetch(`/api/notifications/${n.id}/dismiss`, { method: 'PUT' })
      );

      // Wait for all dismiss requests to complete
      await Promise.all(dismissPromises);
      
      // After all are dismissed on the backend, clear local state
      setNotifications([]);
    } catch (err) {
      console.error('Error dismissing all notifications:', err);
    }
  };

  return {
    data: notifications,
    isLoading,
    error,
    isConnected,
    markAsRead,
    dismissNotification, // Exposed new function
    dismissAll // Renamed and exposed new function
  }
}
