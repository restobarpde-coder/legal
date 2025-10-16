'use client'

import { useQuery } from '@tanstack/react-query'

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
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  })
}
