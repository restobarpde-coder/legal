'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    let channel: any

    const setupRealtime = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setIsLoading(false)
          return
        }

        // Load initial notifications
        const { data: initialData, error: initialError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .is('dismissed_at', null)
          .order('created_at', { ascending: false })
          .limit(50)

        if (initialError) throw initialError

        // Map DB fields to frontend model if needed (though we should align them)
        // For now, we assume the DB structure matches closely enough or we adapt here
        setNotifications(initialData as Notification[])
        setIsLoading(false)

        // Subscribe to Broadcast channel (more reliable for direct notifications)
        const channelName = `user-notifications-${user.id}`
        console.log('🔌 Setting up Broadcast subscription:', channelName)

        channel = supabase
          .channel(channelName)
          .on(
            'broadcast',
            { event: 'new-notification' },
            (payload) => {
              console.log('📡 Broadcast event received:', payload)
              const newNotification = payload.payload as Notification

              // Add to state
              setNotifications(prev => [newNotification, ...prev])

              // Show browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(newNotification.title, {
                  body: newNotification.message || '',
                  icon: '/favicon.ico',
                  tag: newNotification.id,
                })
              }
            }
          )
          .subscribe((status, err) => {
            console.log('📡 Subscription status:', status, err)
            if (status === 'SUBSCRIBED') {
              setIsConnected(true)
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              console.error('❌ Channel error:', err)
              setIsConnected(false)
            }
          })

      } catch (err) {
        console.error('Error setting up notifications:', err)
        setError(err as Error)
        setIsLoading(false)
      }
    }

    setupRealtime()

    // Request permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error

      // Optimistic update is handled by Realtime subscription usually, 
      // but we can also update locally for instant feedback
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      ))
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const dismissNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (err) {
      console.error('Error dismissing notification:', err)
    }
  }

  const dismissAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('user_id', user.id)
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

  return {
    data: filteredNotifications,
    isLoading,
    error,
    isConnected,
    markAsRead,
    dismissNotification,
    dismissAll,
    clearAll: dismissAll // Alias for compatibility
  }
}
