'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type Note = {
  id: string
  title: string | null
  content: string
  case_id: string
  client_id: string | null
  is_private: boolean
  created_by: string
  created_at: string
}

// Fetch notes for a case
export function useNotes(caseId: string) {
  return useQuery({
    queryKey: ['notes', caseId],
    queryFn: async (): Promise<Note[]> => {
      const response = await fetch(`/api/cases/${caseId}/notes`)
      if (!response.ok) {
        throw new Error('Failed to fetch notes')
      }
      return response.json()
    },
    enabled: !!caseId,
  })
}

// Create note mutation
export function useCreateNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      caseId, 
      title, 
      content, 
      isPrivate 
    }: { 
      caseId: string
      title?: string
      content: string
      isPrivate?: boolean
    }) => {
      const response = await fetch(`/api/cases/${caseId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content, isPrivate }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create note')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate notes query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['notes', variables.caseId] })
      
      // Also invalidate the case details to update note count
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId] })
      
      // If we're on the cases list, invalidate that too
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

// Delete note mutation (if needed)
export function useDeleteNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ caseId, noteId }: { caseId: string; noteId: string }) => {
      const response = await fetch(`/api/cases/${caseId}/notes/${noteId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete note')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate notes query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['notes', variables.caseId] })
      
      // Also invalidate the case details
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId] })
      
      // If we're on the cases list, invalidate that too
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}
