'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Briefcase, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: string
  due_date: string | null
  case_id: string
  case_title?: string
  assigned_to: string | null
  assigned_user?: {
    full_name: string
    email: string
  }
  created_by: string
  created_by_user?: {
    full_name: string
    email: string
  }
  created_at: string
}

interface TaskCalendarProps {
  tasks: Task[]
  currentUserId: string
  users?: Array<{ id: string; full_name: string; email: string }>
  onTaskClick?: (task: Task) => void
}

export function TaskCalendar({ tasks, currentUserId, users = [], onTaskClick }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'all' | 'assigned' | 'created'>('all')

  // Filtrar tareas según el modo de vista y usuario seleccionado
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filtrar por usuario
      if (selectedUser !== 'all') {
        const matchesAssigned = task.assigned_to === selectedUser
        const matchesCreated = task.created_by === selectedUser
        
        if (viewMode === 'assigned' && !matchesAssigned) return false
        if (viewMode === 'created' && !matchesCreated) return false
        if (viewMode === 'all' && !matchesAssigned && !matchesCreated) return false
      } else {
        // Si no hay usuario seleccionado, aplicar filtro de vista para el usuario actual
        if (viewMode === 'assigned' && task.assigned_to !== currentUserId) return false
        if (viewMode === 'created' && task.created_by !== currentUserId) return false
      }
      
      return true
    })
  }, [tasks, selectedUser, viewMode, currentUserId])

  // Obtener días del mes con semanas completas
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { locale: es })
    const end = endOfWeek(endOfMonth(currentDate), { locale: es })
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  // Agrupar tareas por día
  const tasksByDay = useMemo(() => {
    const grouped = new Map<string, Task[]>()
    
    filteredTasks.forEach(task => {
      if (task.due_date) {
        const dateKey = format(new Date(task.due_date), 'yyyy-MM-dd')
        const existing = grouped.get(dateKey) || []
        grouped.set(dateKey, [...existing, task])
      }
    })
    
    return grouped
  }, [filteredTasks])

  // Obtener color según prioridad
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // Obtener badge de prioridad
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" className="text-xs">Urgente</Badge>
      case 'high':
        return <Badge variant="outline" className="text-xs border-orange-500 text-orange-700">Alta</Badge>
      case 'medium':
        return <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">Media</Badge>
      case 'low':
        return <Badge variant="outline" className="text-xs border-green-500 text-green-700">Baja</Badge>
      default:
        return null
    }
  }

  // Navegación de meses
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  // Contar tareas por prioridad
  const taskStats = useMemo(() => {
    const stats = {
      total: filteredTasks.length,
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
      overdue: 0,
      today: 0,
      upcoming: 0
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    filteredTasks.forEach(task => {
      if (task.due_date) {
        const dueDate = new Date(task.due_date)
        dueDate.setHours(0, 0, 0, 0)
        
        if (dueDate < today) stats.overdue++
        else if (dueDate.getTime() === today.getTime()) stats.today++
        else stats.upcoming++
      }
      
      switch (task.priority) {
        case 'urgent': stats.urgent++; break
        case 'high': stats.high++; break
        case 'medium': stats.medium++; break
        case 'low': stats.low++; break
      }
    })
    
    return stats
  }, [filteredTasks])

  return (
    <div className="space-y-4">
      {/* Header con controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Calendario de Tareas
              </CardTitle>
              <CardDescription>
                Vista mensual de todas tus tareas y asignaciones
              </CardDescription>
            </div>
            
            {/* Controles de navegación */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                onClick={goToToday}
                className="px-3"
              >
                Hoy
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <div className="ml-4 text-lg font-semibold">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </div>
            </div>
          </div>
          
          {/* Filtros */}
          <div className="flex items-center gap-4 mt-4">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="assigned">Asignadas a mí</TabsTrigger>
                <TabsTrigger value="created">Creadas por mí</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {users.length > 0 && (
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Estadísticas */}
          <div className="flex gap-6 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{taskStats.total}</span>
              <span className="text-sm text-muted-foreground">tareas</span>
            </div>
            
            {taskStats.overdue > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  {taskStats.overdue} vencidas
                </span>
              </div>
            )}
            
            {taskStats.today > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-600">
                  {taskStats.today} para hoy
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {taskStats.upcoming} próximas
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendario */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
            {/* Días de la semana */}
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div
                key={day}
                className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
            
            {/* Días del mes */}
            {monthDays.map((day, index) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayTasks = tasksByDay.get(dateKey) || []
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isCurrentDay = isToday(day)
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[120px] p-2 bg-background border border-border
                    ${!isCurrentMonth ? 'opacity-40' : ''}
                    ${isCurrentDay ? 'bg-accent/20 ring-2 ring-primary/20' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${
                      isCurrentDay ? 'text-primary' : 'text-foreground'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {dayTasks.length > 0 && (
                      <Badge variant="secondary" className="text-xs h-5 px-1">
                        {dayTasks.length}
                      </Badge>
                    )}
                  </div>
                  
                  <ScrollArea className="h-[80px]">
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          className={`
                            p-1 rounded text-xs cursor-pointer
                            transition-colors hover:opacity-80
                            ${getPriorityColor(task.priority)}
                          `}
                          onClick={() => onTaskClick?.(task)}
                          title={`${task.title} - ${task.case_title || 'Caso'}`}
                        >
                          <div className="font-medium truncate">
                            {task.title}
                          </div>
                          {task.case_title && (
                            <div className="text-xs opacity-75 truncate">
                              {task.case_title}
                            </div>
                          )}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{dayTasks.length - 3} más
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lista de tareas próximas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Próximas Tareas</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {filteredTasks
                .filter(task => task.due_date)
                .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
                .slice(0, 10)
                .map(task => {
                  const dueDate = new Date(task.due_date!)
                  const isOverdue = dueDate < new Date() && !isToday(dueDate)
                  
                  return (
                    <div
                      key={task.id}
                      className={`
                        p-3 rounded-lg border cursor-pointer
                        transition-colors hover:bg-accent/50
                        ${isOverdue ? 'border-red-200 bg-red-50/50' : ''}
                      `}
                      onClick={() => onTaskClick?.(task)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{task.title}</h4>
                            {getPriorityBadge(task.priority)}
                          </div>
                          
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            {task.case_title && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {task.case_title}
                              </span>
                            )}
                            
                            {task.assigned_user && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {task.assigned_user.full_name}
                              </span>
                            )}
                            
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(dueDate, 'dd/MM/yyyy HH:mm', { locale: es })}
                            </span>
                          </div>
                        </div>
                        
                        {task.case_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/dashboard/cases/${task.case_id}`}>
                              Ver caso
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              
              {filteredTasks.filter(t => t.due_date).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay tareas programadas
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
