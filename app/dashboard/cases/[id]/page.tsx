"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Edit, Users, FileText, CheckSquare, Clock, Mail, Phone, Building, StickyNote, Trash2, MoreVertical } from "lucide-react"
import Link from "next/link"
import { NoteModal } from "@/components/modals/note-modal"
import { TaskModal } from "@/components/modals/task-modal"
import { DocumentModal } from "@/components/modals/document-modal"
import { TimeEntryModal } from "@/components/modals/time-entry-modal"
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal"
import { toast } from "sonner"

async function getCase(id: string, supabase: any) {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return null
  }

  try {
    // Simple query - let RLS handle the access control
    const { data: case_, error } = await supabase
      .from("cases")
      .select(`
        *,
        clients (
          id,
          name,
          email,
          phone,
          company,
          address
        ),
        case_members (
          user_id,
          role,
          users (
            full_name,
            email,
            role
          )
        )
      `)
      .eq("id", id)
      .single()

    if (error || !case_) {
      console.log('Error getting case or case not found:', error)
      return null
    }

    // Get related data - RLS will automatically filter these based on the policies
    const [tasksResult, documentsResult, notesResult, timeEntriesResult] = await Promise.all([
      supabase.from("tasks").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      supabase.from("notes").select("*").eq("case_id", id).order("created_at", { ascending: false }),
      supabase.from("time_entries").select("*, users(full_name)").eq("case_id", id).order("date", { ascending: false }),
    ])

    return {
      case: case_,
      tasks: tasksResult.data || [],
      documents: documentsResult.data || [],
      notes: notesResult.data || [],
      timeEntries: timeEntriesResult.data || [],
    }
  } catch (error) {
    console.error('Error in getCase:', error)
    return null
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "default"
    case "pending":
      return "secondary"
    case "closed":
      return "outline"
    case "archived":
      return "destructive"
    default:
      return "outline"
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Activo"
    case "pending":
      return "Pendiente"
    case "closed":
      return "Cerrado"
    case "archived":
      return "Archivado"
    default:
      return status
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "urgent":
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950"
    case "high":
      return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950"
    case "medium":
      return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
    case "low":
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950"
    default:
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950"
  }
}

function getPriorityLabel(priority: string) {
  switch (priority) {
    case "urgent":
      return "Urgente"
    case "high":
      return "Alta"
    case "medium":
      return "Media"
    case "low":
      return "Baja"
    default:
      return priority
  }
}

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [caseId, setCaseId] = useState("")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [documentModalOpen, setDocumentModalOpen] = useState(false)
  const [timeModalOpen, setTimeModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{type: string, id: string, name: string} | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await params
      setCaseId(resolvedParams.id)
      const result = await getCase(resolvedParams.id, supabase)
      setData(result)
      setLoading(false)
    }
    loadData()
  }, [params])

  const refreshData = async () => {
    if (caseId) {
      console.log('🔄 Refrescando datos del caso:', caseId)
      const result = await getCase(caseId, supabase)
      console.log('📊 Nuevos datos obtenidos:', result)
      setData(result)
      console.log('✅ Estado actualizado')
    } else {
      console.warn('⚠️ No hay caseId para refrescar')
    }
  }

  const handleDelete = async (type: string, id: string, name: string) => {
    setDeleteTarget({ type, id, name })
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    
    console.log('🗑️ Iniciando eliminación:', deleteTarget)
    setDeleteLoading(true)
    
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('❌ Usuario no autenticado:', authError)
        toast.error('Debes estar autenticado para eliminar elementos')
        return
      }
      
      console.log('✅ Usuario autenticado:', user.email)
      
      let deleteResult = null
      
      // Special handling for documents - need to delete from storage too
      if (deleteTarget.type === 'documents') {
        console.log('📄 Eliminando documento...')
        
        // First get the document to find the file_path
        const { data: document, error: fetchError } = await supabase
          .from('documents')
          .select('file_path')
          .eq('id', deleteTarget.id)
          .single()

        if (fetchError) {
          console.error('❌ Error fetching document:', fetchError)
          toast.error('Error al obtener información del documento')
          return
        }
        
        console.log('📁 Documento encontrado:', document)

        // Delete file from storage if it exists
        if (document?.file_path) {
          console.log('🗂️ Eliminando archivo del storage:', document.file_path)
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([document.file_path])

          if (storageError) {
            console.error('⚠️ Storage delete error (continuando):', storageError)
            // Continue with database deletion even if storage fails
          } else {
            console.log('✅ Archivo eliminado del storage')
          }
        }

        // Delete from database
        console.log('🗄️ Eliminando de la base de datos...')
        deleteResult = await supabase
          .from('documents')
          .delete()
          .eq('id', deleteTarget.id)
          .select() // Return deleted data to verify

        console.log('📊 Resultado de eliminación documento:', deleteResult)
        
        if (deleteResult.error) {
          console.error('❌ Database delete error:', deleteResult.error)
          toast.error(`Error al eliminar documento: ${deleteResult.error.message}`)
          return
        }
        
        // Check if anything was actually deleted
        if (!deleteResult.data || deleteResult.data.length === 0) {
          console.warn('⚠️ No se eliminó ningún documento - posible problema de permisos')
          toast.error('No se pudo eliminar el documento. Verifica tus permisos.')
          return
        }
      } else {
        // Regular deletion for other types
        console.log(`🔄 Eliminando ${deleteTarget.type}...`)
        deleteResult = await supabase
          .from(deleteTarget.type)
          .delete()
          .eq('id', deleteTarget.id)
          .select() // Return deleted data to verify
          
        console.log(`📊 Resultado de eliminación ${deleteTarget.type}:`, deleteResult)

        if (deleteResult.error) {
          console.error('❌ Delete error:', deleteResult.error)
          toast.error(`Error al eliminar ${deleteTarget.type}: ${deleteResult.error.message}`)
          return
        }
        
        // Check if anything was actually deleted
        if (!deleteResult.data || deleteResult.data.length === 0) {
          console.warn(`⚠️ No se eliminó ningún ${deleteTarget.type} - posible problema de permisos`)
          toast.error(`No se pudo eliminar ${deleteTarget.type}. Verifica tus permisos.`)
          return
        }
      }

      console.log('✅ Eliminación confirmada - elemento(s) eliminado(s):', deleteResult.data.length)
      
      // Success - show message and refresh
      const entityNames = {
        'tasks': 'tarea',
        'documents': 'documento', 
        'notes': 'nota',
        'time_entries': 'entrada de tiempo'
      }
      const entityName = entityNames[deleteTarget.type as keyof typeof entityNames] || deleteTarget.type
      
      console.log('🔄 Refrescando datos...')
      await refreshData()
      console.log('✅ Datos refrescados')
      
      toast.success(`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} eliminado exitosamente`)
      
    } catch (error: any) {
      console.error('❌ Error inesperado al eliminar:', error)
      toast.error(`Error inesperado: ${error.message || 'Error desconocido'}`)
    } finally {
      setDeleteLoading(false)
      setDeleteModalOpen(false)
      setDeleteTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Cargando caso...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Caso no encontrado</h2>
          <p className="text-muted-foreground mb-4">El caso que buscas no existe o no tienes permisos para verlo.</p>
          <Button asChild>
            <Link href="/dashboard/cases">Volver a Casos</Link>
          </Button>
        </div>
      </div>
    )
  }

  const { case: case_, tasks, documents, notes, timeEntries } = data
  const totalHours = timeEntries.reduce((sum, entry) => sum + Number.parseFloat(entry.hours.toString()), 0)
  const totalBilled = timeEntries
    .filter((entry) => entry.billable)
    .reduce((sum, entry) => sum + Number.parseFloat(entry.hours.toString()) * (entry.rate || case_.hourly_rate || 0), 0)

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
            <h1 className="text-3xl font-bold tracking-tight">{case_.title}</h1>
            <Badge variant={getStatusColor(case_.status)}>{getStatusLabel(case_.status)}</Badge>
            <Badge className={getPriorityColor(case_.priority)} variant="outline">
              {getPriorityLabel(case_.priority)}
            </Badge>
          </div>
          <p className="text-muted-foreground">{case_.description}</p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/cases/${case_.id}/edit`}>
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
                    <p className="text-sm">{case_.description || 'Sin descripción'}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Fecha de Inicio</p>
                      <p>{new Date(case_.start_date).toLocaleDateString("es-ES")}</p>
                    </div>
                    {case_.end_date && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Fecha de Fin</p>
                        <p>{new Date(case_.end_date).toLocaleDateString("es-ES")}</p>
                      </div>
                    )}
                    {case_.estimated_hours && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Horas Estimadas</p>
                        <p>{case_.estimated_hours} horas</p>
                      </div>
                    )}
                    {case_.hourly_rate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Tarifa por Hora</p>
                        <p>${case_.hourly_rate.toLocaleString()}</p>
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
                <p className="font-medium">{case_.clients.name}</p>
                {case_.clients.company && <p className="text-sm text-muted-foreground">{case_.clients.company}</p>}
              </div>
              <Separator />
              <div className="space-y-2">
                {case_.clients.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${case_.clients.email}`} className="text-primary hover:underline">
                      {case_.clients.email}
                    </a>
                  </div>
                )}
                {case_.clients.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${case_.clients.phone}`} className="text-primary hover:underline">
                      {case_.clients.phone}
                    </a>
                  </div>
                )}
                {case_.clients.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{case_.clients.address}</span>
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
                <Link href={`/dashboard/cases/${case_.id}/time`}>Ver Registro de Tiempo</Link>
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
                {case_.case_members.map((member: any) => (
                  <div key={member.user_id} className="flex items-center justify-between">
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
        caseId={case_.id}
        onSuccess={refreshData}
      />
      
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        caseId={case_.id}
        onSuccess={refreshData}
      />
      
      <DocumentModal
        isOpen={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        caseId={case_.id}
        onSuccess={refreshData}
      />
      
      <TimeEntryModal
        isOpen={timeModalOpen}
        onClose={() => setTimeModalOpen(false)}
        caseId={case_.id}
        defaultRate={case_.hourly_rate || 0}
        onSuccess={refreshData}
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
