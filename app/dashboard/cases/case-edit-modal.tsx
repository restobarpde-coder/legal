'use client'

import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { updateCase } from './actions'
import { CaseForm } from './case-form'
import { useClients } from '@/hooks/use-clients'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type CaseEditModalProps = {
  caseId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CaseDetailsResponse = {
  caseData: {
    id: string
    title: string
    description: string | null
    client_id: string
    counterparty_name: string | null
    counterparty_lawyer: string | null
    status: string
    priority: string
    start_date: string
    end_date: string | null
    estimated_hours: number | null
    hourly_rate: number | null
    numero_archivo?: string | null
    numero_carpeta?: string | null
  }
}

export function CaseEditModal({ caseId, open, onOpenChange }: CaseEditModalProps) {
  const queryClient = useQueryClient()
  const { data: clientsData = [], isLoading: isLoadingClients, error: clientsError } = useClients()

  const {
    data: caseDetails,
    isLoading: isLoadingCase,
    error: caseError,
  } = useQuery({
    queryKey: ['case-edit', caseId],
    queryFn: async (): Promise<CaseDetailsResponse> => {
      const response = await fetch(`/api/cases/${caseId}`)
      if (!response.ok) {
        throw new Error('No se pudo cargar el caso')
      }
      return response.json()
    },
    enabled: open && !!caseId,
  })

  const clients = useMemo(
    () =>
      clientsData.map((client) => ({
        id: client.id,
        name: client.name,
        company: client.company ?? null,
      })),
    [clientsData]
  )

  const formattedCase = useMemo(() => {
    if (!caseDetails?.caseData) return null

    const caseData = caseDetails.caseData
    return {
      id: caseData.id,
      title: caseData.title,
      description: caseData.description || '',
      client_id: caseData.client_id,
      counterparty_name: caseData.counterparty_name || '',
      counterparty_lawyer: caseData.counterparty_lawyer || '',
      status: caseData.status as 'active' | 'pending' | 'closed' | 'archived',
      priority: caseData.priority as 'low' | 'medium' | 'high' | 'urgent',
      start_date: caseData.start_date,
      end_date: caseData.end_date || '',
      estimated_hours: caseData.estimated_hours?.toString() || '',
      hourly_rate: caseData.hourly_rate?.toString() || '',
      numero_archivo: caseData.numero_archivo || '',
      numero_carpeta: caseData.numero_carpeta || '',
    }
  }, [caseDetails])

  if (!caseId) return null

  const updateCaseWithId = updateCase.bind(null, caseId)

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['cases'] })
    queryClient.invalidateQueries({ queryKey: ['case', caseId] })
    queryClient.invalidateQueries({ queryKey: ['case-edit', caseId] })
    onOpenChange(false)
  }

  const isLoading = isLoadingCase || isLoadingClients
  const hasError = !!caseError || !!clientsError

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Editar Caso</DialogTitle>
          <DialogDescription>
            Actualiza los detalles del caso sin salir de la lista.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando formulario...
          </div>
        )}

        {!isLoading && hasError && (
          <p className="text-sm text-red-600">
            No pudimos cargar los datos para editar este caso. Intentá nuevamente.
          </p>
        )}

        {!isLoading && !hasError && formattedCase && (
          <CaseForm
            case={formattedCase}
            clients={clients}
            formAction={updateCaseWithId}
            returnStateOnSuccess
            onSuccess={handleSuccess}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
