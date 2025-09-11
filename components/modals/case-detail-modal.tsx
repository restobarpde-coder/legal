'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuditHistory } from '@/components/audit-history'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  History,
  User,
  Users,
} from 'lucide-react'

interface CaseDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caseData: {
    id: string
    title: string
    description: string
    status: string
    priority: string
    start_date: string
    end_date?: string
    estimated_hours?: number
    hourly_rate?: number
    created_at: string
    clients?: {
      name: string
      email?: string
      company?: string
    }
    case_members?: Array<{
      user_id: string
      role: string
    }>
  }
}

export function CaseDetailModal({ open, onOpenChange, caseData }: CaseDetailModalProps) {
  const [activeTab, setActiveTab] = useState('details')

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-gray-100 text-gray-800',
      archived: 'bg-red-100 text-red-800',
    }
    
    const statusLabels: Record<string, string> = {
      active: 'Activo',
      pending: 'Pendiente',
      closed: 'Cerrado',
      archived: 'Archivado',
    }
    
    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {statusLabels[status] || status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityColors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    }
    
    const priorityLabels: Record<string, string> = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente',
    }
    
    return (
      <Badge className={priorityColors[priority] || 'bg-gray-100 text-gray-800'}>
        {priorityLabels[priority] || priority}
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            {caseData.title}
          </DialogTitle>
          <DialogDescription>
            Detalles completos del caso y su historial de cambios
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Detalles
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Equipo
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Auditoría
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 max-h-[60vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estado</p>
                    {getStatusBadge(caseData.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Prioridad</p>
                    {getPriorityBadge(caseData.priority)}
                  </div>
                </div>

                {caseData.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Descripción</p>
                    <p className="text-sm">{caseData.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Fecha de inicio</p>
                      <p className="text-sm">
                        {format(new Date(caseData.start_date), 'dd/MM/yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>

                  {caseData.end_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Fecha de fin</p>
                        <p className="text-sm">
                          {format(new Date(caseData.end_date), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {(caseData.estimated_hours || caseData.hourly_rate) && (
                  <div className="grid grid-cols-2 gap-4">
                    {caseData.estimated_hours && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Horas estimadas</p>
                          <p className="text-sm">{caseData.estimated_hours} horas</p>
                        </div>
                      </div>
                    )}

                    {caseData.hourly_rate && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Tarifa por hora</p>
                          <p className="text-sm">${caseData.hourly_rate}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {caseData.clients && (
              <Card>
                <CardHeader>
                  <CardTitle>Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{caseData.clients.name}</p>
                      {caseData.clients.email && (
                        <p className="text-sm text-muted-foreground">{caseData.clients.email}</p>
                      )}
                      {caseData.clients.company && (
                        <p className="text-sm text-muted-foreground">{caseData.clients.company}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="team" className="space-y-4 max-h-[60vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Miembros del Equipo</CardTitle>
                <CardDescription>
                  Personas con acceso a este caso
                </CardDescription>
              </CardHeader>
              <CardContent>
                {caseData.case_members && caseData.case_members.length > 0 ? (
                  <div className="space-y-2">
                    {caseData.case_members.map((member) => (
                      <div key={member.user_id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="text-sm">Usuario ID: {member.user_id}</span>
                        </div>
                        <Badge variant="secondary">{member.role}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay miembros asignados</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="max-h-[60vh] overflow-y-auto">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Registro Inmutable:</strong> Todos los cambios realizados a este caso quedan registrados permanentemente 
                con hash criptográfico SHA-256. Nadie puede editar o eliminar estos registros.
              </p>
            </div>
            <AuditHistory 
              tableName="cases" 
              recordId={caseData.id}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
