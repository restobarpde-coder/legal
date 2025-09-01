'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ArrowLeft, Edit, Users, FileText, CheckSquare, Clock, Mail, Phone, Building, StickyNote, Trash2, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { NoteModal } from '@/components/modals/note-modal'
import { TaskModal } from '@/components/modals/task-modal'
import { DocumentModal } from '@/components/modals/document-modal'
import { TimeEntryModal } from '@/components/modals/time-entry-modal'
import { DeleteConfirmationModal } from '@/components/delete-confirmation-modal'
import { toast } from 'sonner'
import { CaseMembersManager } from '../case-members-manager'
import { useCaseDetails } from '@/hooks/use-case-details'

type CaseDetailsClientProps = {
    caseId: string;
};

// Helper functions (could be moved to a utils file)
function getStatusColor(status: string) {
    switch (status) {
        case 'active': return 'default';
        case 'pending': return 'secondary';
        case 'closed': return 'outline';
        case 'archived': return 'destructive';
        default: return 'outline';
    }
}

function getStatusLabel(status: string) {
    switch (status) {
        case "active": return "Activo";
        case "pending": return "Pendiente";
        case "closed": return "Cerrado";
        case "archived": return "Archivado";
        default: return status;
    }
}

function getPriorityColor(priority: string) {
    switch (priority) {
        case "urgent": return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950";
        case "high": return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950";
        case "medium": return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950";
        case "low": return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950";
        default: return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950";
    }
}

function getPriorityLabel(priority: string) {
    switch (priority) {
        case "urgent": return "Urgente";
        case "high": return "Alta";
        case "medium": return "Media";
        case "low": return "Baja";
        default: return priority;
    }
}

export function CaseDetailsClient({ caseId }: CaseDetailsClientProps) {
    const [noteModalOpen, setNoteModalOpen] = useState(false)
    const [taskModalOpen, setTaskModalOpen] = useState(false)
    const [documentModalOpen, setDocumentModalOpen] = useState(false)
    const [timeModalOpen, setTimeModalOpen] = useState(false)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ type: string, id: string, name: string } | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    
    // Fetch case details using React Query
    const { data: caseDetails, isLoading, error } = useCaseDetails(caseId)

    const handleDelete = async (type: string, id: string, name: string) => {
        setDeleteTarget({ type, id, name })
        setDeleteModalOpen(true)
    }

    const confirmDelete = async () => {
        // ... (keep existing delete logic)
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/cases">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
                <div className="text-center py-8">Cargando detalles del caso...</div>
            </div>
        )
    }

    if (error || !caseDetails) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/cases">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold tracking-tight text-red-600">Error</h1>
                        <p className="text-muted-foreground">No se pudo cargar el caso</p>
                    </div>
                </div>
            </div>
        )
    }

    const { caseData, tasks, documents, notes, timeEntries, assignableUsers, canManage } = caseDetails
    const totalHours = timeEntries.reduce((sum, entry) => sum + Number(entry.hours), 0)
    const totalBilled = timeEntries
        .filter((entry) => entry.billable)
        .reduce((sum, entry) => sum + Number(entry.hours) * (entry.rate || caseData.hourly_rate || 0), 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/cases">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold tracking-tight">{caseData.title}</h1>
                        <Badge variant={getStatusColor(caseData.status)}>{getStatusLabel(caseData.status)}</Badge>
                        <Badge className={getPriorityColor(caseData.priority)} variant="outline">
                            {getPriorityLabel(caseData.priority)}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">{caseData.description}</p>
                </div>
                <CaseMembersManager caseData={caseData} assignableUsers={assignableUsers} canManage={canManage} />
                <Button asChild>
                    <Link href={`/dashboard/cases/${caseData.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
                {/* Main content with tabs */}
                <div className="lg:col-span-3">
                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="overview">Resumen</TabsTrigger>
                            <TabsTrigger value="tasks">Tareas ({tasks.length})</TabsTrigger>
                            <TabsTrigger value="documents">Documentos ({documents.length})</TabsTrigger>
                            <TabsTrigger value="notes">Notas ({notes.length})</TabsTrigger>
                            <TabsTrigger value="time">Tiempo ({timeEntries.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            {/* Case details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Información General</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">Descripción</p>
                                        <p className="text-sm">{caseData.description || 'Sin descripción'}</p>
                                    </div>
                                    <Separator />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Fecha de Inicio</p>
                                            <p>{new Date(caseData.start_date).toLocaleDateString("es-ES")}</p>
                                        </div>
                                        {caseData.end_date && (
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Fecha de Fin</p>
                                                <p>{new Date(caseData.end_date).toLocaleDateString("es-ES")}</p>
                                            </div>
                                        )}
                                        {caseData.estimated_hours && (
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Horas Estimadas</p>
                                                <p>{caseData.estimated_hours} horas</p>
                                            </div>
                                        )}
                                        {caseData.hourly_rate && (
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Tarifa por Hora</p>
                                                <p>${caseData.hourly_rate.toLocaleString()}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent activity summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Actividad Reciente</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {/* Recent tasks */}
                                        {tasks.slice(0, 3).map((task) => (
                                            <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div>
                                                    <p className="font-medium">{task.title}</p>
                                                    <p className="text-sm text-muted-foreground">Tarea • {new Date(task.created_at).toLocaleDateString("es-ES")}</p>
                                                </div>
                                                <Badge variant={task.status === "completed" ? "default" : "secondary"}>{task.status}</Badge>
                                            </div>
                                        ))}

                                        {/* Recent documents */}
                                        {documents.slice(0, 2).map((doc) => (
                                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div>
                                                    <p className="font-medium">{doc.name}</p>
                                                    <p className="text-sm text-muted-foreground">Documento • {new Date(doc.created_at).toLocaleDateString("es-ES")}</p>
                                                </div>
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        ))}

                                        {tasks.length === 0 && documents.length === 0 && (
                                            <p className="text-center text-muted-foreground py-4">No hay actividad reciente</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="tasks">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Tareas del Caso</CardTitle>
                                        <Button size="sm" onClick={() => setTaskModalOpen(true)}>
                                            <CheckSquare className="h-4 w-4 mr-2" />
                                            Nueva Tarea
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {tasks.length === 0 ? (
                                            <div className="text-center py-8">
                                                <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                                <h3 className="text-lg font-semibold mb-2">No hay tareas</h3>
                                                <p className="text-muted-foreground mb-4">Comienza creando la primera tarea para este caso</p>
                                                <Button onClick={() => setTaskModalOpen(true)}>
                                                    Nueva Tarea
                                                </Button>
                                            </div>
                                        ) : (
                                            tasks.map((task) => (
                                                <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium">{task.title}</h4>
                                                        <p className="text-sm text-muted-foreground">{task.description}</p>
                                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                            <span>Prioridad: {task.priority}</span>
                                                            {task.due_date && (
                                                                <span>Vence: {new Date(task.due_date).toLocaleDateString("es-ES")}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                                                            {task.status}
                                                        </Badge>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete('tasks', task.id, task.title)}
                                                                    className="text-red-600"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Eliminar
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="documents">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Documentos del Caso</CardTitle>
                                        <Button size="sm" onClick={() => setDocumentModalOpen(true)}>
                                            <FileText className="h-4 w-4 mr-2" />
                                            Subir Documento
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {documents.length === 0 ? (
                                            <div className="text-center py-8">
                                                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                                <h3 className="text-lg font-semibold mb-2">No hay documentos</h3>
                                                <p className="text-muted-foreground mb-4">Sube el primer documento para este caso</p>
                                                <Button onClick={() => setDocumentModalOpen(true)}>
                                                    Subir Documento
                                                </Button>
                                            </div>
                                        ) : (
                                            documents.map((doc) => (
                                                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-8 w-8 text-muted-foreground" />
                                                        <div>
                                                            <h4 className="font-medium">{doc.name}</h4>
                                                            <p className="text-sm text-muted-foreground">
                                                                {doc.document_type} • {new Date(doc.created_at).toLocaleDateString("es-ES")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button size="sm" variant="outline">Descargar</Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete('documents', doc.id, doc.name)}
                                                                    className="text-red-600"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Eliminar
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="notes">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Notas del Caso</CardTitle>
                                        <Button size="sm" onClick={() => setNoteModalOpen(true)}>
                                            <StickyNote className="h-4 w-4 mr-2" />
                                            Nueva Nota
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {notes.length === 0 ? (
                                            <div className="text-center py-8">
                                                <StickyNote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                                <h3 className="text-lg font-semibold mb-2">No hay notas</h3>
                                                <p className="text-muted-foreground mb-4">Agrega la primera nota para este caso</p>
                                                <Button onClick={() => setNoteModalOpen(true)}>
                                                    Nueva Nota
                                                </Button>
                                            </div>
                                        ) : (
                                            notes.map((note) => (
                                                <div key={note.id} className="p-4 border rounded-lg">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            {note.title && <h4 className="font-medium mb-2">{note.title}</h4>}
                                                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                                            <p className="text-xs text-muted-foreground mt-2">
                                                                {new Date(note.created_at).toLocaleDateString("es-ES")} -
                                                                {note.is_private && <span className="text-amber-600"> Privada</span>}
                                                            </p>
                                                        </div>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete('notes', note.id, note.title || 'Nota sin título')}
                                                                    className="text-red-600"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Eliminar
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="time">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Registro de Tiempo</CardTitle>
                                        <Button size="sm" onClick={() => setTimeModalOpen(true)}>
                                            <Clock className="h-4 w-4 mr-2" />
                                            Registrar Tiempo
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {/* Time summary */}
                                        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
                                                <p className="text-sm text-muted-foreground">Total Registradas</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">${totalBilled.toLocaleString()}</p>
                                                <p className="text-sm text-muted-foreground">Total Facturado</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">
                                                    {timeEntries.filter(entry => entry.billable).length}
                                                </p>
                                                <p className="text-sm text-muted-foreground">Entradas Facturables</p>
                                            </div>
                                        </div>

                                        {/* Time entries */}
                                        {timeEntries.length === 0 ? (
                                            <div className="text-center py-8">
                                                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                                <h3 className="text-lg font-semibold mb-2">No hay tiempo registrado</h3>
                                                <p className="text-muted-foreground mb-4">Comienza registrando el tiempo trabajado en este caso</p>
                                                <Button onClick={() => setTimeModalOpen(true)}>
                                                    Registrar Tiempo
                                                </Button>
                                            </div>
                                        ) : (
                                            timeEntries.map((entry) => (
                                                <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium">{entry.description}</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            {entry.users?.full_name} • {new Date(entry.date).toLocaleDateString("es-ES")}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="font-medium">{entry.hours}h</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {entry.billable ? 'Facturable' : 'No facturable'}
                                                            </p>
                                                        </div>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete('time_entries', entry.id, entry.description)}
                                                                    className="text-red-600"
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Eliminar
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Client info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Cliente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="font-medium">{caseData.clients.name}</p>
                                {caseData.clients.company && <p className="text-sm text-muted-foreground">{caseData.clients.company}</p>}
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                {caseData.clients.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <a href={`mailto:${caseData.clients.email}`} className="text-primary hover:underline">
                                            {caseData.clients.email}
                                        </a>
                                    </div>
                                )}
                                {caseData.clients.phone && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <a href={`tel:${caseData.clients.phone}`} className="text-primary hover:underline">
                                            {caseData.clients.phone}
                                        </a>
                                    </div>
                                )}
                                {caseData.clients.address && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Building className="h-4 w-4 text-muted-foreground" />
                                        <span>{caseData.clients.address}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Time tracking */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Tiempo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Horas Registradas</span>
                                <span className="font-medium">{totalHours.toFixed(1)}h</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Total Facturado</span>
                                <span className="font-medium">${totalBilled.toLocaleString()}</span>
                            </div>
                            <Separator />
                            <Button size="sm" className="w-full" asChild>
                                <Link href={`/dashboard/cases/${caseData.id}/time`}>Ver Registro de Tiempo</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Team members */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Equipo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
{caseData.case_members.map((member: any, index) => (
                                    <div key={`member-${member.users.id || index}`} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{member.users.full_name}</p>
                                            <p className="text-xs text-muted-foreground">{member.users.role}</p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {member.role}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modales */}
            <NoteModal
                isOpen={noteModalOpen}
                onClose={() => setNoteModalOpen(false)}
                caseId={caseData.id}
            />

            <TaskModal
                isOpen={taskModalOpen}
                onClose={() => setTaskModalOpen(false)}
                caseId={caseData.id}
            />

            <DocumentModal
                isOpen={documentModalOpen}
                onClose={() => setDocumentModalOpen(false)}
                caseId={caseData.id}
            />

            <TimeEntryModal
                isOpen={timeModalOpen}
                onClose={() => setTimeModalOpen(false)}
                caseId={caseData.id}
                defaultRate={caseData.hourly_rate || 0}
            />

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirmar eliminación"
                description="Esta acción no se puede deshacer."
                itemName={deleteTarget?.name}
                loading={deleteLoading}
            />
        </div>
    )
}
