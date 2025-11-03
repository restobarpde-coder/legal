'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export type CaseDetails = {
  caseData: {
    id: string
    title: string
    description?: string
    counterparty_name: string | null
    counterparty_lawyer: string | null
    status: string
    priority: string
    start_date: string
    end_date?: string
    hourly_rate?: number
    estimated_hours?: number
    client_id: string
    created_at: string
    created_by: string
    clients: {
      id: string
      name: string
      email?: string
      phone?: string
      address?: string
      company?: string
    }
    case_members: {
      role: string
      user_id: string
      users: {
        id: string
        full_name: string
        email: string
        role: 'admin' | 'lawyer' | 'assistant'
      }
    }[]
  }
  tasks: {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    due_date: string | null
    assigned_to: string
    created_by: string
    created_at: string
    updated_at: string
  }[]
  documents: {
    id: string
    name: string
    file_path: string
    file_size: number
    mime_type: string
    document_type: string
    description: string | null
    uploaded_by: string
    created_at: string
    updated_at: string
  }[]
  notes: {
    id: string
    title: string | null
    content: string
    is_private: boolean
    created_by: string
    created_at: string
    updated_at: string
  }[]
  timeEntries: {
    id: string
    description: string
    hours: number
    rate: number | null
    billable: boolean
    date: string
    user_id: string
    created_at: string
    updated_at: string
    users: {
      id: string
      full_name: string
    }
  }[]
  assignableUsers: {
    id: string
    full_name: string
    email: string
    role: 'admin' | 'lawyer' | 'assistant'
  }[]
  canManage: boolean
}

// Fetch full case details
export function useCaseDetails(caseId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    if (!caseId) return

    // Subscribe to changes in tasks
    const tasksChannel = supabase
      .channel(`tasks-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `case_id=eq.${caseId}`,
        },
        () => {
          // Invalidate the case query to trigger a refetch
          queryClient.invalidateQueries({ queryKey: ['case', caseId] })
        }
      )
      .subscribe()

    // Subscribe to changes in documents
    const documentsChannel = supabase
      .channel(`documents-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `case_id=eq.${caseId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['case', caseId] })
        }
      )
      .subscribe()

    // Subscribe to changes in notes
    const notesChannel = supabase
      .channel(`notes-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `case_id=eq.${caseId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['case', caseId] })
        }
      )
      .subscribe()

    // Subscribe to changes in time entries
    const timeEntriesChannel = supabase
      .channel(`time-entries-${caseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `case_id=eq.${caseId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['case', caseId] })
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(tasksChannel)
      supabase.removeChannel(documentsChannel)
      supabase.removeChannel(notesChannel)
      supabase.removeChannel(timeEntriesChannel)
    }
  }, [caseId, queryClient, supabase])
  
  return useQuery({
    queryKey: ['case', caseId],
    queryFn: async (): Promise<CaseDetails> => {
      const response = await fetch(`/api/cases/${caseId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch case details')
      }
      return response.json()
    },
    enabled: !!caseId,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Keep as fallback, but realtime will update instantly
    staleTime: 0, // Always consider data stale for immediate updates
  })
}
