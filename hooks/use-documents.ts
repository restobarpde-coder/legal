'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type Document = {
  id: string
  name: string
  file_path: string
  file_size: number
  mime_type: string
  document_type: string
  description: string | null
  case_id: string
  uploaded_by: string
  created_at: string
}

// Fetch documents for a case
export function useDocuments(caseId: string) {
  return useQuery({
    queryKey: ['documents', caseId],
    queryFn: async (): Promise<Document[]> => {
      const response = await fetch(`/api/cases/${caseId}/documents`)
      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }
      return response.json()
    },
    enabled: !!caseId,
  })
}

// Upload documents mutation
export function useUploadDocuments() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      caseId, 
      files, 
      documentType, 
      description 
    }: { 
      caseId: string
      files: File[]
      documentType: string
      description?: string
    }) => {
      const formData = new FormData()
      
      // Add all files
      files.forEach(file => {
        formData.append('files', file)
      })
      
      formData.append('documentType', documentType)
      if (description) {
        formData.append('description', description)
      }

      const response = await fetch(`/api/cases/${caseId}/documents`, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload documents')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate documents query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['documents', variables.caseId] })
      
      // Also invalidate the case details to update document count
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId] })
      
      // If we're on the cases list, invalidate that too
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

// Delete document mutation (if needed)
export function useDeleteDocument() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ caseId, documentId }: { caseId: string; documentId: string }) => {
      const response = await fetch(`/api/cases/${caseId}/documents/${documentId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete document')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate documents query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['documents', variables.caseId] })
      
      // Also invalidate the case details
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId] })
      
      // If we're on the cases list, invalidate that too
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}
