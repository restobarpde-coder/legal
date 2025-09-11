'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  History,
  User,
  Calendar,
  FileText,
  Shield,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash,
  Plus,
  Hash,
  Lock,
  Eye,
} from 'lucide-react'

interface AuditLog {
  id: string
  table_name: string
  record_id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  user_id: string
  user_email: string
  user_name: string
  user_role: string
  old_data: any
  new_data: any
  changed_fields: string[] | null
  ip_address: string | null
  user_agent: string | null
  data_hash: string
  previous_hash: string
  created_at: string
  user?: {
    full_name: string
    email: string
    role: string
  }
}

interface AuditHistoryProps {
  tableName?: string
  recordId?: string
  showIntegrityCheck?: boolean
}

export function AuditHistory({ 
  tableName, 
  recordId,
  showIntegrityCheck = false 
}: AuditHistoryProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [filterOperation, setFilterOperation] = useState<string>('all')
  const [integrityStatus, setIntegrityStatus] = useState<{
    isValid: boolean
    brokenAt: string | null
    errorMessage: string | null
  } | null>(null)

  // Fetch audit logs
  const { data: auditLogs, isLoading, error } = useQuery({
    queryKey: ['audit', tableName, recordId, filterOperation],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (tableName) params.append('table', tableName)
      if (recordId) params.append('recordId', recordId)
      if (filterOperation !== 'all') params.append('operation', filterOperation)
      
      const response = await fetch(`/api/audit?${params}`)
      if (!response.ok) throw new Error('Error fetching audit logs')
      return response.json()
    },
  })

  // Check integrity (only for admins)
  const checkIntegrity = async () => {
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        setIntegrityStatus(data)
      }
    } catch (error) {
      console.error('Error checking integrity:', error)
    }
  }

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return <Plus className="h-4 w-4" />
      case 'UPDATE':
        return <Edit className="h-4 w-4" />
      case 'DELETE':
        return <Trash className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return 'bg-green-100 text-green-800'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTableNameInSpanish = (table: string) => {
    const translations: Record<string, string> = {
      'clients': 'Clientes',
      'cases': 'Casos',
      'tasks': 'Tareas',
      'documents': 'Documentos',
      'notes': 'Notas',
      'time_entries': 'Registros de Tiempo',
    }
    return translations[table] || table
  }

  const getOperationInSpanish = (operation: string) => {
    const translations: Record<string, string> = {
      'INSERT': 'Creación',
      'UPDATE': 'Modificación',
      'DELETE': 'Eliminación',
    }
    return translations[operation] || operation
  }

  const formatChangedFields = (fields: string[] | null) => {
    if (!fields || fields.length === 0) return 'N/A'
    
    const fieldTranslations: Record<string, string> = {
      'title': 'Título',
      'description': 'Descripción',
      'status': 'Estado',
      'priority': 'Prioridad',
      'due_date': 'Fecha de vencimiento',
      'name': 'Nombre',
      'email': 'Correo',
      'phone': 'Teléfono',
      'content': 'Contenido',
    }
    
    return fields
      .map(field => fieldTranslations[field] || field)
      .join(', ')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <CardTitle>Historial de Auditoría</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={filterOperation} onValueChange={setFilterOperation}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por operación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las operaciones</SelectItem>
                  <SelectItem value="INSERT">Creaciones</SelectItem>
                  <SelectItem value="UPDATE">Modificaciones</SelectItem>
                  <SelectItem value="DELETE">Eliminaciones</SelectItem>
                </SelectContent>
              </Select>
              
              {showIntegrityCheck && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkIntegrity}
                  className="flex items-center space-x-1"
                >
                  <Shield className="h-4 w-4" />
                  <span>Verificar Integridad</span>
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            Registro inmutable de todos los cambios realizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integrityStatus && (
            <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
              integrityStatus.isValid 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}>
              {integrityStatus.isValid ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>✓ Cadena de integridad verificada correctamente</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5" />
                  <span>{integrityStatus.errorMessage}</span>
                </>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-4">Cargando historial...</div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">
              Error al cargar el historial
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Operación</TableHead>
                    {!tableName && <TableHead>Tabla</TableHead>}
                    <TableHead>Usuario</TableHead>
                    <TableHead>Campos Modificados</TableHead>
                    <TableHead>Hash</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs?.map((log: AuditLog) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge className={getOperationColor(log.operation)}>
                          <span className="flex items-center space-x-1">
                            {getOperationIcon(log.operation)}
                            <span>{getOperationInSpanish(log.operation)}</span>
                          </span>
                        </Badge>
                      </TableCell>
                      {!tableName && (
                        <TableCell>{getTableNameInSpanish(log.table_name)}</TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span className="text-sm">{log.user_name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.user_role}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatChangedFields(log.changed_fields)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Hash className="h-3 w-3" />
                          <span className="font-mono text-xs">
                            {log.data_hash.substring(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!auditLogs || auditLogs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No hay registros de auditoría
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for detailed view */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Detalles del Registro de Auditoría</span>
            </DialogTitle>
            <DialogDescription>
              Registro inmutable y verificable criptográficamente
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Fecha y Hora</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedLog.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Operación</p>
                    <Badge className={getOperationColor(selectedLog.operation)}>
                      {getOperationInSpanish(selectedLog.operation)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Usuario</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedLog.user_name} ({selectedLog.user_email})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Rol</p>
                    <p className="text-sm text-muted-foreground">{selectedLog.user_role}</p>
                  </div>
                  {selectedLog.ip_address && (
                    <div>
                      <p className="text-sm font-medium">Dirección IP</p>
                      <p className="text-sm text-muted-foreground">{selectedLog.ip_address}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Hash del Registro (SHA-256)</p>
                  <p className="font-mono text-xs bg-muted p-2 rounded break-all">
                    {selectedLog.data_hash}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Hash Anterior (Cadena de Integridad)</p>
                  <p className="font-mono text-xs bg-muted p-2 rounded break-all">
                    {selectedLog.previous_hash}
                  </p>
                </div>

                {selectedLog.changed_fields && selectedLog.changed_fields.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Campos Modificados</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedLog.changed_fields.map((field) => (
                        <Badge key={field} variant="secondary">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLog.old_data && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Datos Anteriores</p>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_data && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Datos Nuevos</p>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
