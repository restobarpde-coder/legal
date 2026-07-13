'use client'

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Notification = {
  id: string
  user_id?: string
  type: string
  title: string
  message?: string
  created_at: string
  read_at?: string | null
  dismissed_at?: string | null
  // Related entity details
  case_id?: string | null
  task_id?: string | null
  related_entity_type?: string
  related_entity_id?: string
  metadata?: Record<string, any>
  // Additional fields mapped from metadata or joins
  taskTitle?: string
  taskDescription?: string | null
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  hoursUntilDue?: number
  urgencyLevel?: 'critical' | 'high' | 'medium' | 'low'
}

type NotificationsContextValue = {
  data: Notification[]
  isLoading: boolean
  error: Error | null
  isConnected: boolean
  markAsRead: (notificationId: string) => Promise<void>
  dismissNotification: (notificationId: string) => Promise<void>
  dismissByEntity: (entityType: string, entityId: string) => Promise<void>
  dismissAll: () => Promise<void>
  clearAll: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

function sortNotifications(items: Notification[]) {
  return [...items].sort((left, right) =>
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  )
}

function isPendingNotification(notification: Notification) {
  return !notification.read_at && !notification.dismissed_at
}

function upsertNotification(items: Notification[], incoming: Notification) {
  if (!isPendingNotification(incoming)) {
    return items.filter(item => item.id !== incoming.id)
  }
  const existing = items.find(item => item.id === incoming.id)
  const merged = existing ? { ...existing, ...incoming } : incoming
  return sortNotifications([...items.filter(item => item.id !== incoming.id), merged])
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const userIdRef = useRef<string | null>(null)
  const loadRequestRef = useRef(0)
  const eventVersionRef = useRef(0)
  const notificationEventsRef = useRef(new Map<string, { version: number; notification: Notification }>())

  const loadNotifications = useCallback(async (userId: string, initial = false) => {
    const requestId = ++loadRequestRef.current
    const eventVersionAtStart = eventVersionRef.current
    if (initial) setIsLoading(true)
    const { data, error: loadError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .is('read_at', null)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (requestId !== loadRequestRef.current || userIdRef.current !== userId) return
    if (loadError) {
      setError(loadError)
    } else {
      const snapshot = sortNotifications((data ?? []) as Notification[])
      const currentEventVersion = eventVersionRef.current
      const concurrentEvents = [...notificationEventsRef.current.values()]
        .filter(event => event.version > eventVersionAtStart)
        .sort((left, right) => left.version - right.version)
      setNotifications(concurrentEvents.reduce(
        (current, event) => upsertNotification(current, event.notification),
        snapshot
      ))
      for (const [notificationId, event] of notificationEventsRef.current) {
        if (event.version <= currentEventVersion) notificationEventsRef.current.delete(notificationId)
      }
      setError(null)
    }
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null
    let hasSubscribed = false
    let needsRecovery = false

    const setupRealtime = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (!active) return
        if (authError || !user) {
          setIsLoading(false)
          return
        }
        userIdRef.current = user.id

        const channelName = `user-notifications-${user.id}`

        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
            (payload) => {
              const newNotification = payload.new as Notification
              const version = ++eventVersionRef.current
              notificationEventsRef.current.set(newNotification.id, { version, notification: newNotification })
              setNotifications(current => upsertNotification(current, newNotification))

              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(newNotification.title, {
                  body: newNotification.message || '',
                  icon: '/favicon.ico',
                  tag: newNotification.id,
                })
              }
            },
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
            (payload) => {
              const updatedNotification = payload.new as Notification
              const version = ++eventVersionRef.current
              notificationEventsRef.current.set(updatedNotification.id, { version, notification: updatedNotification })
              setNotifications(current => upsertNotification(current, updatedNotification))
            },
          )
          .subscribe((status) => {
            if (!active) return
            if (status === 'SUBSCRIBED') {
              setIsConnected(true)
              // Reconcile on the first subscription to close the gap between
              // the initial HTTP query and the Realtime handshake.
              if (!hasSubscribed || needsRecovery) void loadNotifications(user.id)
              hasSubscribed = true
              needsRecovery = false
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setIsConnected(false)
              if (hasSubscribed) needsRecovery = true
            }
          })

        void loadNotifications(user.id, true)

      } catch (err) {
        if (!active) return
        setError(err as Error)
        setIsLoading(false)
      }
    }

    setupRealtime()

    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }

    return () => {
      active = false
      userIdRef.current = null
      loadRequestRef.current++
      notificationEventsRef.current.clear()
      if (channel) void supabase.removeChannel(channel)
    }
  }, [loadNotifications, supabase])

  useEffect(() => {
    const reconcile = () => {
      if (document.visibilityState !== 'visible' || !userIdRef.current) return
      void loadNotifications(userIdRef.current)
    }
    const reconcileOnline = () => {
      if (userIdRef.current) void loadNotifications(userIdRef.current)
    }
    const interval = window.setInterval(reconcile, 30_000)

    document.addEventListener('visibilitychange', reconcile)
    window.addEventListener('online', reconcileOnline)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', reconcile)
      window.removeEventListener('online', reconcileOnline)
    }
  }, [loadNotifications])

  const markAsRead = async (notificationId: string) => {
    try {
      const userId = userIdRef.current
      if (!userId) return
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', userId)

      if (error) throw error
      setNotifications(current => current.filter(notification => notification.id !== notificationId))
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const dismissNotification = async (notificationId: string) => {
    try {
      const userId = userIdRef.current
      if (!userId) return
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now, dismissed_at: now })
        .eq('id', notificationId)
        .eq('user_id', userId)

      if (error) throw error

      setNotifications(current => current.filter(notification => notification.id !== notificationId))
    } catch (err) {
      console.error('Error dismissing notification:', err)
    }
  }

  const dismissByEntity = async (entityType: string, entityId: string) => {
    try {
      const response = await fetch('/api/notifications/entity/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId }),
      })
      if (!response.ok) return
      setNotifications(prev => prev.filter(notification => !(
        notification.related_entity_type === entityType && notification.related_entity_id === entityId
      )))
    } catch (err) {
      console.error('Error dismissing entity notifications:', err)
    }
  }

  const dismissAll = async () => {
    try {
      const userId = userIdRef.current
      if (!userId) return
      const now = new Date().toISOString()

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now, dismissed_at: now })
        .eq('user_id', userId)
        .is('read_at', null)
        .is('dismissed_at', null)

      if (error) throw error

      setNotifications([])
    } catch (err) {
      console.error('Error dismissing all:', err)
    }
  }

  // Filter notifications to show only the latest one per task
  const filteredNotifications = notifications.reduce((acc, current) => {
    // Identify if it's a task notification
    const isTask = current.related_entity_type === 'task' || !!current.task_id
    const taskId = current.related_entity_type === 'task'
      ? current.related_entity_id
      : current.task_id

    if (isTask && taskId) {
      // Check if we already have a notification for this task
      const existingIndex = acc.findIndex(n => {
        const nTaskId = n.related_entity_type === 'task' ? n.related_entity_id : n.task_id
        return (n.related_entity_type === 'task' || !!n.task_id) && nTaskId === taskId
      })

      if (existingIndex >= 0) {
        // If current is newer than existing, replace it
        if (new Date(current.created_at) > new Date(acc[existingIndex].created_at)) {
          acc[existingIndex] = current
        }
        // If existing is newer, do nothing (keep existing)
      } else {
        acc.push(current)
      }
    } else {
      // Non-task notifications are always added
      acc.push(current)
    }
    return acc
  }, [] as Notification[])
    // Sort by created_at desc again just in case
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const value: NotificationsContextValue = {
    data: filteredNotifications,
    isLoading,
    error,
    isConnected,
    markAsRead,
    dismissNotification,
    dismissByEntity,
    dismissAll,
    clearAll: dismissAll,
  }

  return createElement(NotificationsContext.Provider, { value }, children)
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) throw new Error('useNotifications debe usarse dentro de NotificationsProvider')
  return context
}
