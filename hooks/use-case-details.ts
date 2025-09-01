'use client'

import { useQuery } from '@tanstack/react-query'

export type CaseDetails = {
  caseData: {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    start_date: string
    end_date: string | null
    hourly_rate: number | null
    created_at: string
    created_by: string
    clients: {
      id: string
      name: string
      email: string | null
      phone: string | null
      address: string | null
      company: string | null
    }
    case_members: {
      role: string
      user_id: string
      users: {
        id: string
        full_name: string
        email: string
        role: string
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
    created_at: string
  }[]
  documents: {
    id: string
    name: string
    file_path: string
    file_size: number
    mime_type: string
    document_type: string
    description: string | null
    created_at: string
  }[]
  notes: {
    id: string
    title: string | null
    content: string
    is_private: boolean
    created_at: string
  }[]
  timeEntries: {
    id: string
    description: string
    hours: number
    rate: number | null
    billable: boolean
    date: string
    created_at: string
    users: {
      id: string
      full_name: string
    }
  }[]
  assignableUsers: {
    id: string
    full_name: string
    email: string
    role: string
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
