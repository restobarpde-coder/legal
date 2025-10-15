'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type Task = {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  due_date: string | null
  case_id: string
  assigned_to: string
  created_by: string
  created_at: string
  updated_at: string
}

// Fetch tasks for a case
export function useTasks(caseId: string) {
  return useQuery({
    queryKey: ['tasks', caseId],
    queryFn: async (): Promise<Task[]> => {
      const response = await fetch(`/api/cases/${caseId}/tasks`)
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      return response.json()
    },
    enabled: !!caseId,
  })
}

// Create task mutation
export function useCreateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      caseId, 
      title, 
      description, 
      priority,
      status,
      dueDate 
    }: { 
      caseId: string
      title: string
      description?: string
      priority?: string
      status?: string
      dueDate?: string
    }) => {
      const response = await fetch(`/api/cases/${caseId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, description, priority, status, dueDate }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create task')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate tasks query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.caseId] })
      
      // Also invalidate the case details to update task count
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId] })
      
      // If we're on the cases list, invalidate that too
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

// Delete task mutation
export function useDeleteTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ caseId, taskId }: { caseId: string; taskId: string }) => {
      const response = await fetch(`/api/cases/${caseId}/tasks/${taskId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete task')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate tasks query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.caseId] })
      
      // Also invalidate the case details
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId] })
      
      // If we're on the cases list, invalidate that too
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

// Update task mutation
export function useUpdateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      caseId, 
      taskId, 
      updates 
    }: { 
      caseId: string
      taskId: string
      updates: Partial<Task>
    }) => {
      const response = await fetch(`/api/cases/${caseId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update task')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate tasks query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.caseId] })
      
      // Also invalidate the case details
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId] })
      
      // If we're on the cases list, invalidate that too
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}
