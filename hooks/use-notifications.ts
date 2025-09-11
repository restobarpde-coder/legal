'use client'

import { useQuery } from '@tanstack/react-query'

export type Notification = {
  id: string
  type: 'task' | 'event'
  title: string
  dueDate: string
  caseId: string
}

// Fetch notifications
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<Notification[]> => {
      const response = await fetch('/api/notifications')
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      const data = await response.json()
      return data.notifications
    },
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every 60 seconds
  })
}
