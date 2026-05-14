'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

type Case = {
  id: string;
  title: string;
  description: string | null;
  counterparty_name: string | null;
  counterparty_lawyer: string | null;
  status: string;
  priority: string;
  start_date: string;
  end_date: string | null;
  hourly_rate: number | null;
  created_at: string;
  clients: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
  } | null;
  case_members: {
    user_id: string;
    role: string;
  }[];
};

// Fetch cases
export function useCases(searchQuery?: string, statusFilter?: string, priorityFilter?: string) {
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const invalidateCaseQueries = (caseId?: string) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })

      if (caseId) {
        queryClient.invalidateQueries({ queryKey: ['case', caseId] })
        queryClient.invalidateQueries({ queryKey: ['case-edit', caseId] })
      }
    }

    const channel = supabase
      .channel('cases-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases',
        },
        (payload) => {
          const changedCaseId =
            (payload.new as { id?: string } | null)?.id ||
            (payload.old as { id?: string } | null)?.id

          invalidateCaseQueries(changedCaseId)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_members',
        },
        (payload) => {
          const changedCaseId =
            (payload.new as { case_id?: string } | null)?.case_id ||
            (payload.old as { case_id?: string } | null)?.case_id

          invalidateCaseQueries(changedCaseId)
          queryClient.invalidateQueries({ queryKey: ['assignable-users'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
        },
        () => {
          // The cases list renders client name/company, so client edits must refresh it too.
          queryClient.invalidateQueries({ queryKey: ['cases'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, supabase])

  return useQuery({
    queryKey: ['cases', searchQuery, statusFilter, priorityFilter],
    queryFn: async (): Promise<Case[]> => {
      const params = new URLSearchParams()
      if (searchQuery) params.append('q', searchQuery)
      if (statusFilter) params.append('status', statusFilter)
      if (priorityFilter) params.append('priority', priorityFilter)

      const queryString = params.toString()
      const endpoint = queryString ? `/api/cases?${queryString}` : '/api/cases'
      const response = await fetch(endpoint, {
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error('Failed to fetch cases')
      }
      return response.json()
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}

// Add case member mutation
export function useAddCaseMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ caseId, userId, role }: { caseId: string; userId: string; role?: string }) => {
      const response = await fetch(`/api/cases/${caseId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add member')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate both cases and individual case queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case'] })
      queryClient.invalidateQueries({ queryKey: ['assignable-users'] })
    },
  })
}

// Remove case member mutation
export function useRemoveCaseMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ caseId, userId }: { caseId: string; userId: string }) => {
      const response = await fetch(`/api/cases/${caseId}/members?userId=${userId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove member')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case'] })
      queryClient.invalidateQueries({ queryKey: ['assignable-users'] })
    },
  })
}
