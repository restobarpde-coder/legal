'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Activity,
  AlertCircle,
  Briefcase,
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  Filter,
  Paperclip,
  Trash2,
  User,
  Users,
  Eye,
  EyeOff,
  Shield,
  Edit,
  Plus,
  X,
  History,
  FilePlus,
  FileEdit,
  FileX,
  RefreshCw,
} from 'lucide-react'

interface TimelineEvent {
  id: string
  type: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  title: string
  description: string
  icon: string
  color: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  data: any
  changedFields?: string[]
  createdAt: string
  isDeleted: boolean
  originalTable: string
  recordId: string
  currentData?: any
}

interface CaseTimelineProps {
  caseId: string
  showDeleted?: boolean
  maxHeight?: string
}

export function CaseTimeline({ 
  caseId, 
  showDeleted = true,
  maxHeight = '600px'
}: CaseTimelineProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'deleted'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['case-timeline', caseId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/cases/${caseId}/timeline`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Timeline API Error:', errorData)
          throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
        }
        const result = await response.json()
        console.log('Timeline data received:', result)
        return result
      } catch (err) {
        console.error('Timeline fetch error:', err)
        throw err
      }
    },
    refetchInterval: 5000, // Actualizar cada 5 segundos para cambios en tiempo real
    retry: 1
  })

  const getOperationIcon = (operation: string, type: string) => {
    if (operation === 'INSERT') {
      return <FilePlus className="h-4 w-4 text-green-600" />
    } else if (operation === 'UPDATE') {
      return <FileEdit className="h-4 w-4 text-blue-600" />
    } else if (operation === 'DELETE') {
      return <FileX className="h-4 w-4 text-red-600" />
    }
    return <Activity className="h-4 w-4 text-gray-600" />
  }

  const getOperationText = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return 'creó'
      case 'UPDATE':
        return 'actualizó'
      case 'DELETE':
        return 'eliminó'
      default:
        return 'modificó'
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'task':
        return 'una tarea'
      case 'note':
        return 'una nota'
      case 'document':
        return 'un documento'
      case 'time':
        return 'registro de tiempo'
      case 'case':
        return 'el caso'
      case 'member':
        return 'un miembro'
      default:
        return 'un elemento'
    }
  }


  // Filtrar eventos
  const filteredEvents = data?.timeline?.filter((event: TimelineEvent) => {
    // Filtro por estado (activo/eliminado)
    const isDeleted = event.operation === 'DELETE' || event.isDeleted
    if (filter === 'active' && isDeleted) return false
    if (filter === 'deleted' && !isDeleted) return false
    
    // Filtro por tipo
    if (typeFilter !== 'all' && event.type !== typeFilter) return false
    
    return true
  }) || []

  // Obtener tipos únicos para el filtro
  const eventTypes = [...new Set(data?.timeline?.map((e: TimelineEvent) => e.type) || [])]

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          No se pudo cargar el timeline del caso
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="w-full bg-card border-border shadow-sm">
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
            <History className="h-5 w-5 text-primary" />
            Historial
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''} registrado{filteredEvents.length !== 1 ? 's' : ''}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Filtros minimalistas */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="h-9">
            <TabsList className="h-9 bg-muted">
              <TabsTrigger value="all" className="text-xs h-7">
                Todos
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs h-7">
                Activos
              </TabsTrigger>
              <TabsTrigger value="deleted" className="text-xs h-7">
                Eliminados
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <select
            className="h-9 px-3 text-xs rounded-md border border-input bg-background text-foreground"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Todos los tipos</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>
                {type === 'task' && 'Tareas'}
                {type === 'note' && 'Notas'}
                {type === 'document' && 'Documentos'}
                {type === 'time' && 'Tiempo'}
                {type === 'case' && 'Caso'}
                {type === 'member' && 'Miembros'}
                {type === 'unknown' && 'Otros'}
              </option>
            ))}
          </select>
        </div>

        {/* Historial de cambios compacto */}
        <ScrollArea className="w-full" style={{ height: maxHeight }}>
          <div className="space-y-2">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No hay cambios registrados
              </div>
            ) : (
              filteredEvents.map((event: TimelineEvent, index: number) => {
                const isDeleted = event.operation === 'DELETE' || event.isDeleted
                
                
                return (
                <div 
                  key={event.id} 
                  className={`group flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-accent/50 ${
                    isDeleted ? 'opacity-60' : ''
                  }`}
                >
                  {/* Icono de operación */}
                  <div className="mt-0.5">
                    {getOperationIcon(event.operation, event.type)}
                  </div>

                  {/* Contenido del cambio */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      {/* Usuario y acción */}
                      <span className="font-medium text-sm text-foreground">
                        {event.user.name}
                      </span>
                      
                      {/* Para eliminaciones, mostrar de forma especial */}
                      {event.operation === 'DELETE' ? (
                        <>
                          <span className="text-sm text-muted-foreground">
                            eliminó {getTypeText(event.type)}
                          </span>
                          {/* Extraer el nombre del elemento de la descripción */}
                          {event.description && (
                            <span className="text-sm font-medium text-foreground truncate max-w-xs" 
                                  title={event.description}>
                              {event.description.match(/"([^"]+)"/)?.[1] || event.description}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-muted-foreground">
                            {getOperationText(event.operation)} {getTypeText(event.type)}
                          </span>
                          {/* Título del elemento para no-eliminaciones */}
                          {event.description && (
                            <span className="text-sm font-medium text-foreground truncate max-w-xs" 
                                  title={event.description}>
                              "{event.description}"
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Detalles adicionales */}
                    <div className="flex items-center gap-3 mt-1">
                      {/* Tiempo */}
                      <span 
                        className="text-xs text-muted-foreground"
                        title={format(new Date(event.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                      >
                        {formatDistanceToNow(new Date(event.createdAt), { 
                          addSuffix: true, 
                          locale: es 
                        })}
                      </span>

                      {/* Campos modificados */}
                      {event.operation === 'UPDATE' && event.changedFields && event.changedFields.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          • {event.changedFields.length} campo{event.changedFields.length > 1 ? 's' : ''} modificado{event.changedFields.length > 1 ? 's' : ''}
                        </span>
                      )}

                      {/* Badge de eliminado */}
                      {(event.operation === 'DELETE' || event.isDeleted) && (
                        <Badge variant="outline" className="text-xs h-5 px-1.5 border-red-200 text-red-600">
                          eliminado
                        </Badge>
                      )}
                    </div>

                    {/* Descripción opcional - no mostrar para eliminaciones pues ya se muestra arriba */}
                    {event.description && event.operation !== 'DELETE' && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    {/* Datos expandibles para elementos eliminados */}
                    {(event.operation === 'DELETE' || event.isDeleted) && event.data && (
                      <details className="mt-2 group/details">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                          Ver detalles
                        </summary>
                        <div className="mt-2 p-3 bg-muted/50 rounded-md">
                          <pre className="text-xs overflow-auto text-muted-foreground">
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
                )
              })
            )}
          </div>
        </ScrollArea>

      </CardContent>
    </Card>
  )
}
