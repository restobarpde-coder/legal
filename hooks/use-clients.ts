"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  address: string | null
  notes: string | null
  created_at: string
  created_by: string
  users?: { full_name: string } | null
  cases?: { id: string, status: string }[]
}

export interface CreateClientData {
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  notes?: string
}

export interface UpdateClientData extends CreateClientData {
  id: string
}

// Fetch all clients
export function useClients(searchQuery?: string) {
  return useQuery({
    queryKey: ['clients', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) {
        params.append('q', searchQuery)
      }
      
      const response = await fetch(`/api/clients?${params}`)
      if (!response.ok) {
        throw new Error('Error al cargar los clientes')
      }
      return response.json() as Promise<Client[]>
    },
    staleTime: 1000 * 60 * 10, // 10min - datos frescos por más tiempo
    select: (data) => {
      // Transformar datos para optimizar renders
      return data.map(client => ({
        ...client,
        displayName: client.company ? `${client.name} (${client.company})` : client.name
      }))
    },
  })
}

// Fetch single client
export function useClient(clientId: string) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}`)
      if (!response.ok) {
        throw new Error('Error al cargar el cliente')
      }
      return response.json() as Promise<Client>
    },
    enabled: !!clientId,
  })
}

// Create client mutation
export function useCreateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateClientData) => {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al crear el cliente')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch clients list
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

// Update client mutation
export function useUpdateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateClientData) => {
      const response = await fetch(`/api/clients/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al actualizar el cliente')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch clients list and specific client
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] })
    },
  })
}

// Delete client mutation
export function useDeleteClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (clientId: string) => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al eliminar el cliente')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch clients list
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
