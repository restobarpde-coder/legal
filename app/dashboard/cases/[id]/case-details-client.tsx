'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ArrowLeft, Edit, Users, FileText, CheckSquare, Clock, Mail, Phone, Building, StickyNote, Trash2, MoreVertical, Calendar, User, Shield, Activity, Eye, Download } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CaseMembersManager } from '../case-members-manager'
import { useCaseDetails } from '@/hooks/use-case-details'
import { CaseTimeline } from '@/components/case-timeline'
import { TaskStatusSelect, TaskStatusBadge } from '@/components/task-status-select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'

// Lazy load modales pesados solo cuando se necesiten
const NoteModal = dynamic(() => import('@/components/modals/note-modal').then(mod => ({ default: mod.NoteModal })), { ssr: false })
const TaskModal = dynamic(() => import('@/components/modals/task-modal').then(mod => ({ default: mod.TaskModal })), { ssr: false })
const DocumentModal = dynamic(() => import('@/components/modals/document-modal').then(mod => ({ default: mod.DocumentModal })), { ssr: false })
const TimeEntryModal = dynamic(() => import('@/components/modals/time-entry-modal').then(mod => ({ default: mod.TimeEntryModal })), { ssr: false })
const DeleteConfirmationModal = dynamic(() => import('@/components/delete-confirmation-modal').then(mod => ({ default: mod.DeleteConfirmationModal })), { ssr: false })

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
    const router = useRouter()
    
    // Fetch case details using React Query
    const { data: caseDetails, isLoading, error, refetch } = useCaseDetails(caseId)
    
    const handleViewDocument = async (documentId: string) => {
        try {
            const response = await fetch(`/api/documents/${documentId}/view`)
            
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error al cargar documento')
            }
            
            const data = await response.json()
            
            // Abrir documento en nueva pestaña
            window.open(data.viewUrl, '_blank')
            
        } catch (err) {
            console.error('Error viewing document:', err)
            toast.error(err instanceof Error ? err.message : 'Error al abrir documento')
        }
    }
    
    const handleDownloadDocument = async (documentId: string, documentName: string) => {
        try {
            const response = await fetch(`/api/documents/${documentId}/download`)
            
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error al descargar documento')
            }
            
            const data = await response.json()
            
            // Abrir descarga en nueva pestaña
            window.open(data.downloadUrl, '_blank')
            
            toast.success('Descarga iniciada en nueva pestaña')
        } catch (err) {
            console.error('Error downloading document:', err)
            toast.error(err instanceof Error ? err.message : 'Error al descargar documento')
        }
    }

    const handleDelete = async (type: string, id: string, name: string) => {
        setDeleteTarget({ type, id, name })
        setDeleteModalOpen(true)
    }

    const confirmDelete = async () => {
        if (!deleteTarget) return
        
        setDeleteLoading(true)
        try {
            let endpoint = ''
            switch (deleteTarget.type) {
                case 'task':
                    endpoint = `/api/tasks/${deleteTarget.id}`
                    break
                case 'document':
                    endpoint = `/api/documents/${deleteTarget.id}`
                    break
                case 'note':
                    endpoint = `/api/notes/${deleteTarget.id}`
                    break
                case 'time':
                    endpoint = `/api/time-entries/${deleteTarget.id}`
                    break
                default:
                    throw new Error('Tipo no válido')
            }
            
            console.log('Deleting:', deleteTarget.type, deleteTarget.id)
            
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            
    let responseData
    try {
      responseData = await response.json()
    } catch (e) {
      console.error('Failed to parse response:', e)
      responseData = { error: 'Error al procesar respuesta' }
    }
    
    console.log('Delete response:', response.status, responseData)
    
    if (!response.ok) {
      console.error('Delete failed with details:', responseData)
      throw new Error(responseData.error || responseData.message || 'Error al eliminar')
    }
            
            toast.success(`${deleteTarget.name} eliminado correctamente`)
            
            // Refrescar los datos usando React Query
            await refetch()
            
            // Forzar actualización de la página si refetch no funciona
            setTimeout(() => {
                router.refresh()
            }, 500)
            
        } catch (error) {
            console.error('Error deleting:', error)
            toast.error(error instanceof Error ? error.message : 'Error al eliminar')
        } finally {
            setDeleteLoading(false)
            setDeleteModalOpen(false)
            setDeleteTarget(null)
        }
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
                        <h1 className="text-3xl font-bold tracking-tight">Caso</h1>
                        <p className="text-muted-foreground">Cargando detalles del caso...</p>
                    </div>
                </div>
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

    // Create timeline with all activities
    const createTimeline = () => {
        const activities = [
            ...tasks.map(task => ({
                id: `task-${task.id}`,
                type: 'task' as const,
                title: task.title,
                description: task.description,
                date: task.created_at,
                updatedAt: task.updated_at || task.created_at,
                status: task.status,
                priority: task.priority,
                assignedTo: task.assigned_to,
                createdBy: task.created_by,
                data: task
            })),
            ...documents.map(doc => ({
                id: `document-${doc.id}`,
                type: 'document' as const,
                title: doc.name,
                description: doc.document_type || 'Documento',
                date: doc.created_at,
                updatedAt: doc.updated_at,
                createdBy: doc.uploaded_by,
                data: doc
            })),
            ...notes.map(note => ({
                id: `note-${note.id}`,
                type: 'note' as const,
                title: note.title || 'Nota sin título',
                description: note.content,
                date: note.created_at,
                updatedAt: note.updated_at,
                isPrivate: note.is_private,
                createdBy: note.created_by,
                data: note
            })),
            ...timeEntries.map(entry => ({
                id: `time-${entry.id}`,
                type: 'time' as const,
                title: entry.description,
                description: `${entry.hours}h ${entry.billable ? '(Facturable)' : '(No facturable)'}`,
                date: entry.date,
                updatedAt: entry.updated_at,
                createdBy: entry.user_id,
                data: entry
            }))
        ];

        // Sort by most recent first (using updated_at if available, otherwise created_at/date)
        return activities.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.date);
            const dateB = new Date(b.updatedAt || b.date);
            return dateB.getTime() - dateA.getTime();
        });
    }

    const timeline = createTimeline()

    // Helper function to get activity icon
    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'task':
                return <CheckSquare className="h-4 w-4 text-blue-600" />
            case 'document':
                return <FileText className="h-4 w-4 text-green-600" />
            case 'note':
                return <StickyNote className="h-4 w-4 text-yellow-600" />
            case 'time':
                return <Clock className="h-4 w-4 text-purple-600" />
            default:
                return <Calendar className="h-4 w-4 text-gray-600" />
        }
    }

    // Helper function to get activity color
    const getActivityColor = (type: string) => {
        switch (type) {
            case 'task':
                return 'border-blue-200 bg-blue-50'
            case 'document':
                return 'border-green-200 bg-green-50'
            case 'note':
                return 'border-yellow-200 bg-yellow-50'
            case 'time':
                return 'border-purple-200 bg-purple-50'
            default:
                return 'border-gray-200 bg-gray-50'
        }
    }

    // Helper function to format date and time
    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
        
        if (diffInHours < 1) {
            const diffInMinutes = Math.floor(diffInHours * 60)
            return `Hace ${diffInMinutes} minuto${diffInMinutes !== 1 ? 's' : ''}`
        } else if (diffInHours < 24) {
            const hours = Math.floor(diffInHours)
            return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`
        } else {
            return date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            })
        }
    }

    // Get user name by ID (helper function)
    const getUserName = (userId: string) => {
        const member = caseData.case_members.find(m => m.users.id === userId)
        return member?.users.full_name || 'Usuario desconocido'
    }

    return (
        <div className="space-y-6 max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/cases">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex-1 truncate">{caseData.title}</h1>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getStatusColor(caseData.status)}>{getStatusLabel(caseData.status)}</Badge>
                    <Badge className={getPriorityColor(caseData.priority)} variant="outline">
                        {getPriorityLabel(caseData.priority)}
                    </Badge>
                </div>
                
                <p className="text-muted-foreground text-sm sm:text-base">{caseData.description}</p>
                
                <div className="flex flex-wrap items-center gap-2">
                    <CaseMembersManager caseData={caseData} assignableUsers={assignableUsers} canManage={canManage} />
                    <Button asChild size="sm" className="flex-1 sm:flex-none">
                        <Link href={`/dashboard/cases/${caseData.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-4 max-w-full">
                {/* Main content with tabs */}
                <div className="lg:col-span-3 min-w-0">
                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto overflow-x-auto">
                            <TabsTrigger value="overview" className="text-xs sm:text-sm">Resumen</TabsTrigger>
                            <TabsTrigger value="tasks" className="text-xs sm:text-sm">Tareas ({tasks.length})</TabsTrigger>
                            <TabsTrigger value="documents" className="text-xs sm:text-sm">Docs ({documents.length})</TabsTrigger>
                            <TabsTrigger value="notes" className="text-xs sm:text-sm">Notas ({notes.length})</TabsTrigger>
                            <TabsTrigger value="time" className="text-xs sm:text-sm">Tiempo ({timeEntries.length})</TabsTrigger>
                            <TabsTrigger value="timeline" className="flex items-center gap-1 text-xs sm:text-sm">
                                <Shield className="h-3 w-3" />
                                <span className="hidden sm:inline">Historial</span>
                            </TabsTrigger>
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                            {/* Timeline cronológico */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5" />
                                        Timeline de Actividad
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative">
                                        {timeline.length === 0 ? (
                                            <div className="text-center py-8">
                                                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                                <h3 className="text-lg font-semibold mb-2">Sin actividad</h3>
                                                <p className="text-muted-foreground">No hay actividad registrada para este caso</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {/* Timeline line */}
                                                <div className="absolute left-6 top-0 bottom-0 w-px bg-border"></div>
                                                
                                                {timeline.slice(0, 10).map((activity, index) => (
                                                    <div key={activity.id} className="relative flex gap-4">
                                                        {/* Timeline dot */}
                                                        <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white shadow-sm ${
                                                            getActivityColor(activity.type)
                                                        }`}>
                                                            {getActivityIcon(activity.type)}
                                                        </div>
                                                        
                                                        {/* Activity content */}
                                                        <div className="flex-1 min-w-0 pb-6">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <h4 className="font-medium text-sm mb-1">{activity.title}</h4>
                                                                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                                                        {activity.description}
                                                                    </p>
                                                                    
                                                                    {/* Activity metadata */}
                                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                        <span className="flex items-center gap-1">
                                                                            <User className="h-3 w-3" />
                                                                            {getUserName(activity.createdBy)}
                                                                        </span>
                                                                        <span>{formatDateTime(activity.date)}</span>
                                                                        
                                                                        {/* Activity-specific badges */}
                                                                        {activity.type === 'task' && activity.status && (
                                                                            <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                                                                {activity.status}
                                                                            </Badge>
                                                                        )}
                                                                        {activity.type === 'task' && activity.priority && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {activity.priority}
                                                                            </Badge>
                                                                        )}
                                                                        {activity.type === 'note' && activity.isPrivate && (
                                                                            <Badge variant="outline" className="text-xs text-amber-600">
                                                                                Privada
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Activity type badge */}
                                                                <div className="ml-2">
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                                        activity.type === 'task' ? 'bg-blue-100 text-blue-700' :
                                                                        activity.type === 'document' ? 'bg-green-100 text-green-700' :
                                                                        activity.type === 'note' ? 'bg-yellow-100 text-yellow-700' :
                                                                        activity.type === 'time' ? 'bg-purple-100 text-purple-700' :
                                                                        'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                        {activity.type === 'task' && 'Tarea'}
                                                                        {activity.type === 'document' && 'Documento'}
                                                                        {activity.type === 'note' && 'Nota'}
                                                                        {activity.type === 'time' && 'Tiempo'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                {timeline.length > 10 && (
                                                    <div className="text-center pt-4">
                                                        <p className="text-sm text-muted-foreground">
                                                            Y {timeline.length - 10} actividades más...
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Historial completo con auditoría */}
                        <TabsContent value="timeline" className="space-y-4">
                            <CaseTimeline 
                                caseId={caseId}
                                showDeleted={true}
                                maxHeight="600px"
                            />
                        </TabsContent>

                        <TabsContent value="tasks" className="space-y-4">
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
                                                <div key={task.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium truncate">{task.title}</h4>
                                                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                                            <Badge variant="outline" className="text-xs">
                                                                {task.priority === 'urgent' && '🔴 Urgente'}
                                                                {task.priority === 'high' && '🟠 Alta'}
                                                                {task.priority === 'medium' && '🟡 Media'}
                                                                {task.priority === 'low' && '🟢 Baja'}
                                                            </Badge>
                                                            {task.due_date && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Vence: {new Date(task.due_date).toLocaleDateString("es-ES")}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <TaskStatusSelect
                                                            taskId={task.id}
                                                            caseId={caseId}
                                                            currentStatus={task.status as any}
                                                            showAsSelect={false}
                                                            onStatusChange={() => refetch()}
                                                        />
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete('task', task.id, task.title)}
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
                                                <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="font-medium truncate">{doc.name}</h4>
                                                            <p className="text-sm text-muted-foreground">
                                                                {doc.document_type} • {new Date(doc.created_at).toLocaleDateString("es-ES")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            onClick={() => handleViewDocument(doc.id)}
                                                            className="flex-1 sm:flex-none"
                                                        >
                                                            <Eye className="h-4 w-4 sm:mr-1" />
                                                            <span className="hidden sm:inline">Ver</span>
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => handleDownloadDocument(doc.id, doc.name)}
                                                            className="flex-1 sm:flex-none"
                                                        >
                                                            <Download className="h-4 w-4 sm:mr-1" />
                                                            <span className="hidden sm:inline">Descargar</span>
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete('document', doc.id, doc.name)}
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
                                                                    onClick={() => handleDelete('note', note.id, note.title || 'Nota sin título')}
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
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
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
                                                <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium truncate">{entry.description}</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            {entry.users?.full_name} • {new Date(entry.date).toLocaleDateString("es-ES")}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                                                        <div className="text-left sm:text-right">
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
                                                                    onClick={() => handleDelete('time', entry.id, entry.description)}
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
                <div className="space-y-6 lg:sticky lg:top-6">
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

                    {/* Counterparty info */}
                    {(caseData.counterparty_name || caseData.counterparty_lawyer) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Contraparte
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {caseData.counterparty_name && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Nombre</p>
                                        <p className="font-medium">{caseData.counterparty_name}</p>
                                    </div>
                                )}
                                {caseData.counterparty_lawyer && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Abogado</p>
                                        <p className="font-medium">{caseData.counterparty_lawyer}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

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
