'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle, Clock, XCircle, AlertCircle, Loader2 } from 'lucide-react'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

interface TaskStatusSelectProps {
  taskId: string
  caseId: string
  currentStatus: TaskStatus
  onStatusChange?: (newStatus: TaskStatus) => void
  disabled?: boolean
  showAsSelect?: boolean
}

const statusConfig = {
  pending: {
    label: 'Pendiente',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    badgeVariant: 'outline' as const,
  },
  in_progress: {
    label: 'En Progreso',
    icon: AlertCircle,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    badgeVariant: 'secondary' as const,
  },
  completed: {
    label: 'Completada',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-300',
    badgeVariant: 'default' as const,
  },
  cancelled: {
    label: 'Cancelada',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-300',
    badgeVariant: 'destructive' as const,
  },
}

export function TaskStatusSelect({
  taskId,
  caseId,
  currentStatus,
  onStatusChange,
  disabled = false,
  showAsSelect = true,
}: TaskStatusSelectProps) {
  const [status, setStatus] = useState<TaskStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === status) return

    setLoading(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar el estado')
      }

      setStatus(newStatus)
      toast.success(`Estado actualizado a ${statusConfig[newStatus].label}`)
      
      if (onStatusChange) {
        onStatusChange(newStatus)
      }
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el estado')
    } finally {
      setLoading(false)
    }
  }

  const StatusIcon = statusConfig[status].icon

  if (showAsSelect) {
    return (
      <Select
        value={status}
        onValueChange={(value) => handleStatusChange(value as TaskStatus)}
        disabled={disabled || loading}
      >
        <SelectTrigger className="w-[140px]">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SelectValue />
          )}
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusConfig).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <config.icon className="h-4 w-4" />
                {config.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  // Mostrar como Badge (solo lectura o clickeable)
  return (
    <Badge 
      variant={statusConfig[status].badgeVariant}
      className={`flex items-center gap-1 ${!disabled ? 'cursor-pointer' : ''}`}
      onClick={!disabled ? () => {
        // Ciclar entre estados
        const states: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']
        const currentIndex = states.indexOf(status)
        const nextIndex = (currentIndex + 1) % states.length
        handleStatusChange(states[nextIndex])
      } : undefined}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <StatusIcon className="h-3 w-3" />
      )}
      {statusConfig[status].label}
    </Badge>
  )
}

// Función helper para obtener el badge de estado sin funcionalidad
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const StatusIcon = statusConfig[status].icon
  
  return (
    <Badge variant={statusConfig[status].badgeVariant} className="flex items-center gap-1">
      <StatusIcon className="h-3 w-3" />
      {statusConfig[status].label}
    </Badge>
  )
}
