'use client'

import { useState, useMemo, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Eye, Edit, MoreHorizontal, CheckSquare, Clock, User, Calendar, Briefcase, AlertCircle, Trash2, Loader2, LayoutGrid, List } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TaskStatusSelect, TaskStatusBadge } from '@/components/task-status-select'
import { toast } from 'sonner'
import { format, isAfter, isBefore, isToday, isTomorrow, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { TaskModal } from '@/components/modals/task-modal'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TasksClientProps {
  currentUserId: string
}

// Helper function fuera del componente
const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <Badge variant="destructive" className="text-xs">🔴 Urgente</Badge>
    case 'high':
      return <Badge variant="outline" className="text-xs border-orange-500 text-orange-700">🟠 Alta</Badge>
    case 'medium':
      return <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">🟡 Media</Badge>
    case 'low':
      return <Badge variant="outline" className="text-xs border-green-500 text-green-700">🟢 Baja</Badge>
    default:
      return null
  }
}

// Componente memoizado
export const TasksClient = memo(function TasksClient({ currentUserId }: TasksClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)

  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Cargar tareas con React Query
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['all-tasks', currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          cases (
            id,
            title,
            clients (name)
          ),
          assigned_user:users!tasks_assigned_to_fkey (
            full_name
          ),
          created_user:users!tasks_created_by_fkey (
            full_name
          )
        `)
        .or(`assigned_to.eq.${currentUserId},created_by.eq.${currentUserId},assigned_to.is.null`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
  })

  // Filtrar tareas
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Búsqueda por texto
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesTitle = task.title?.toLowerCase().includes(search)
        const matchesDescription = task.description?.toLowerCase().includes(search)
        const matchesCase = task.cases?.title?.toLowerCase().includes(search)
        const matchesClient = task.cases?.clients?.name?.toLowerCase().includes(search)

        if (!matchesTitle && !matchesDescription && !matchesCase && !matchesClient) {
          return false
        }
      }

      // Filtro por estado
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false
      }

      // Filtro por prioridad
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false
      }

      // Filtro por asignación
      if (assignmentFilter === 'assigned_to_me' && task.assigned_to !== currentUserId) {
        return false
      }
      if (assignmentFilter === 'created_by_me' && task.created_by !== currentUserId) {
        return false
      }
      if (assignmentFilter === 'unassigned' && task.assigned_to !== null) {
        return false
      }

      return true
    })
  }, [tasks, searchTerm, statusFilter, priorityFilter, assignmentFilter, currentUserId])

  // Agrupar tareas por estado
  const tasksByStatus = useMemo(() => {
    const grouped = {
      pending: [] as any[],
      in_progress: [] as any[],
      completed: [] as any[],
      cancelled: [] as any[]
    }

    filteredTasks.forEach(task => {
      if (grouped[task.status as keyof typeof grouped]) {
        grouped[task.status as keyof typeof grouped].push(task)
      }
    })

    return grouped
  }, [filteredTasks])

  // Estadísticas
  const stats = useMemo(() => {
    const today = new Date()
    const overdue = filteredTasks.filter(task =>
      task.due_date &&
      isPast(new Date(task.due_date)) &&
      task.status !== 'completed' &&
      task.status !== 'cancelled'
    ).length

    const dueToday = filteredTasks.filter(task =>
      task.due_date && isToday(new Date(task.due_date))
    ).length

    const dueTomorrow = filteredTasks.filter(task =>
      task.due_date && isTomorrow(new Date(task.due_date))
    ).length

    return {
      total: filteredTasks.length,
      pending: tasksByStatus.pending.length,
      in_progress: tasksByStatus.in_progress.length,
      completed: tasksByStatus.completed.length,
      cancelled: tasksByStatus.cancelled.length,
      overdue,
      dueToday,
      dueTomorrow
    }
  }, [filteredTasks, tasksByStatus])

  const handleStatusChange = (taskId: string, newStatus: any) => {
    // Actualizar optimistamente
    queryClient.setQueryData(['all-tasks', currentUserId], (old: any[] = []) =>
      old.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    )
    // Refrescar después
    queryClient.invalidateQueries({ queryKey: ['all-tasks', currentUserId] })
    queryClient.invalidateQueries({ queryKey: ['user-tasks'] })
  }

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la tarea "${taskTitle}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar la tarea')
      }

      toast.success('Tarea eliminada correctamente')
      // Invalidar queries para refrescar
      queryClient.invalidateQueries({ queryKey: ['all-tasks', currentUserId] })
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] })
    } catch (error) {
      toast.error('Error al eliminar la tarea')
      console.error(error)
    }
  }

  const handleTaskClick = (task: any) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
  }

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['all-tasks', currentUserId] })
    queryClient.invalidateQueries({ queryKey: ['user-tasks'] })
  }

  const getDueDateBadge = (dueDate: string) => {
    if (!dueDate) return null

    const date = new Date(dueDate)

    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive" className="text-xs">Vencida</Badge>
    }
    if (isToday(date)) {
      return <Badge variant="outline" className="text-xs border-orange-500 text-orange-700">Hoy</Badge>
    }
    if (isTomorrow(date)) {
      return <Badge variant="outline" className="text-xs border-blue-500 text-blue-700">Mañana</Badge>
    }

    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando tareas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tareas</h1>
          <p className="text-muted-foreground">Gestiona todas las tareas de tu estudio jurídico</p>
        </div>
        <div className="flex gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'board')}>
            <TabsList>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-2" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="board">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Tablero
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => {
            setSelectedTask(null)
            setIsModalOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
            <p className="text-xs text-muted-foreground">En Progreso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Completadas</p>
          </CardContent>
        </Card>
        {stats.overdue > 0 && (
          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <p className="text-xs text-muted-foreground">Vencidas</p>
            </CardContent>
          </Card>
        )}
        {stats.dueToday > 0 && (
          <Card className="border-orange-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.dueToday}</div>
              <p className="text-xs text-muted-foreground">Para Hoy</p>
            </CardContent>
          </Card>
        )}
        {stats.dueTomorrow > 0 && (
          <Card className="border-blue-200">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.dueTomorrow}</div>
              <p className="text-xs text-muted-foreground">Para Mañana</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar tareas, casos o clientes..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Asignación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="assigned_to_me">Asignadas a mí</SelectItem>
                <SelectItem value="created_by_me">Creadas por mí</SelectItem>
                <SelectItem value="unassigned">Sin asignar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vista de tareas */}
      {viewMode === 'board' ? (
        <KanbanBoard
          tasks={filteredTasks}
          onTaskClick={handleTaskClick}
        />
      ) : (
        <div className="grid gap-4">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay tareas que mostrar</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || assignmentFilter !== 'all'
                      ? 'No se encontraron tareas con los filtros aplicados'
                      : 'Comienza creando tu primera tarea'}
                  </p>
                  {!(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || assignmentFilter !== 'all') && (
                    <Button onClick={() => {
                      setSelectedTask(null)
                      setIsModalOpen(true)
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primera Tarea
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-all hover:border-primary/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold truncate flex-1">{task.title}</h3>
                        <div className="flex items-center gap-2 ml-4">
                          {getDueDateBadge(task.due_date)}
                          {getPriorityBadge(task.priority)}
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {task.cases && (
                          <Link
                            href={`/dashboard/cases/${task.cases.id}`}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <Briefcase className="h-4 w-4" />
                            <span className="font-medium">{task.cases.title}</span>
                            {task.cases.clients?.name && (
                              <span className="text-muted-foreground">• {task.cases.clients.name}</span>
                            )}
                          </Link>
                        )}

                        {task.assigned_user && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{task.assigned_user.full_name}</span>
                          </div>
                        )}

                        {task.due_date && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: es })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TaskStatusSelect
                        taskId={task.id}
                        caseId={task.case_id}
                        currentStatus={task.status}
                        showAsSelect={true}
                        onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                      />

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTaskClick(task)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTaskClick(task)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {task.cases && (
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/cases/${task.cases.id}`}>
                                <Briefcase className="h-4 w-4 mr-2" />
                                Ir al Caso
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteTask(task.id, task.title)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        caseId={selectedTask?.case_id || ''}
        taskToEdit={selectedTask}
        onSuccess={handleSuccess}
      />
    </div>
  )
})
