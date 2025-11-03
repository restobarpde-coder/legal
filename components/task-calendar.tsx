'use client'

import { useState, useMemo, useCallback, memo } from 'react'
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

// Componente memoizado para evitar re-renders innecesarios
export const TaskCalendar = memo(function TaskCalendar({ tasks, currentUserId, users = [], onTaskClick }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'all' | 'assigned' | 'created'>('all')
  const [clickedTaskId, setClickedTaskId] = useState<string | null>(null)

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

  // Obtener color según prioridad (memoizado)
  const getPriorityColor = useCallback((priority: string) => {
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
  }, [])

  // Obtener badge de prioridad (memoizado)
  const getPriorityBadge = useCallback((priority: string) => {
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
  }, [])

  // Navegación de meses
  const goToPreviousMonth = useCallback(() => setCurrentDate(subMonths(currentDate, 1)), [currentDate])
  const goToNextMonth = useCallback(() => setCurrentDate(addMonths(currentDate, 1)), [currentDate])
  const goToToday = useCallback(() => setCurrentDate(new Date()), [])

  // Handler optimizado para clicks - SIN delays
  const handleTaskClickOptimized = useCallback((task: Task) => {
    // Feedback visual inmediato
    setClickedTaskId(task.id)
    // Ejecutar navegación inmediatamente sin delay
    onTaskClick?.(task)
    // Limpiar feedback después
    setTimeout(() => setClickedTaskId(null), 300)
  }, [onTaskClick])

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
    <div className="space-y-2 md:space-y-3">
      {/* Header con controles - Optimizado para móvil */}
      <Card>
        <CardHeader className="p-3 md:p-4 space-y-2 md:space-y-3">
          {/* Título y Navegación */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="hidden sm:inline">Calendario de Tareas</span>
                <span className="sm:hidden">Calendario</span>
              </CardTitle>
            </div>
            
            {/* Controles de navegación - Centrados en móvil */}
            <div className="flex items-center justify-between gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex-1 text-center">
                <div className="text-sm md:text-base font-semibold capitalize">
                  {format(currentDate, 'MMMM yyyy', { locale: es })}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="h-8 px-2 text-xs"
              >
                Hoy
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
                className="h-8 px-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Filtros - Stack en móvil */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="all" className="text-xs sm:text-sm">Todas</TabsTrigger>
                <TabsTrigger value="assigned" className="text-xs sm:text-sm">Asignadas a mí</TabsTrigger>
                <TabsTrigger value="created" className="text-xs sm:text-sm">Creadas por mí</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {users.length > 0 && (
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full sm:w-48">
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
          
          {/* Estadísticas - Grid en móvil */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 pt-2 border-t">
            <div className="flex items-center gap-1.5">
              <span className="text-lg md:text-xl font-bold">{taskStats.total}</span>
              <span className="text-xs text-muted-foreground">tareas</span>
            </div>
            
            {taskStats.overdue > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                <span className="text-xs font-medium text-red-600">
                  {taskStats.overdue} vencidas
                </span>
              </div>
            )}
            
            {taskStats.today > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
                <span className="text-xs font-medium text-orange-600">
                  {taskStats.today} hoy
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {taskStats.upcoming} próximas
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendario - Vista Desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-2 md:p-3">
          <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
            {/* Días de la semana */}
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div
                key={day}
                className="bg-muted p-1.5 text-center text-xs font-medium text-muted-foreground"
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
                    min-h-[100px] p-1.5 bg-background border border-border
                    ${!isCurrentMonth ? 'opacity-40' : ''}
                    ${isCurrentDay ? 'bg-accent/20 ring-2 ring-primary/20' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-0.5">
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
                  
                  <ScrollArea className="h-[70px]">
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          className={`
                            p-1 rounded text-[10px] cursor-pointer
                            transition-all duration-75 hover:opacity-80 active:scale-95
                            ${getPriorityColor(task.priority)}
                            ${clickedTaskId === task.id ? 'opacity-50' : ''}
                          `}
                          onClick={() => handleTaskClickOptimized(task)}
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

      {/* Vista Móvil - Lista por semana */}
      <div className="md:hidden space-y-1.5">
        {Array.from({ length: Math.ceil(monthDays.length / 7) }).map((_, weekIndex) => {
          const weekStart = weekIndex * 7
          const weekDays = monthDays.slice(weekStart, weekStart + 7)
          
          return (
            <Card key={weekIndex}>
              <CardContent className="p-2">
                {/* Mini calendario de la semana */}
                <div className="grid grid-cols-7 gap-0.5 mb-2">
                  {weekDays.map((day, dayIndex) => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    const dayTasks = tasksByDay.get(dateKey) || []
                    const isCurrentMonth = isSameMonth(day, currentDate)
                    const isCurrentDay = isToday(day)
                    
                    return (
                      <div
                        key={dayIndex}
                        className={`
                          text-center p-1 rounded text-[10px] transition-all duration-75
                          ${!isCurrentMonth ? 'opacity-30' : ''}
                          ${isCurrentDay ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-accent'}
                          ${dayTasks.length > 0 && !isCurrentDay ? 'bg-accent/50' : ''}
                        `}
                      >
                        <div className="font-medium">{format(day, 'd')}</div>
                        {dayTasks.length > 0 && (
                          <div className="w-1 h-1 rounded-full bg-primary mx-auto mt-0.5" />
                        )}
                      </div>
                    )
                  })}
                </div>
                
                {/* Tareas de la semana */}
                {weekDays.some(day => (tasksByDay.get(format(day, 'yyyy-MM-dd')) || []).length > 0) ? (
                  <div className="space-y-1.5 pt-1.5 border-t">
                    {weekDays.map((day, dayIndex) => {
                      const dateKey = format(day, 'yyyy-MM-dd')
                      const dayTasks = tasksByDay.get(dateKey) || []
                      const isCurrentMonth = isSameMonth(day, currentDate)
                      
                      if (dayTasks.length === 0 || !isCurrentMonth) return null
                      
                      return (
                        <div key={dayIndex} className="space-y-1">
                          <div className="text-[10px] font-medium text-muted-foreground">
                            {format(day, 'EEEE d', { locale: es })}
                          </div>
                          {dayTasks.map(task => (
                            <div
                              key={task.id}
                              className={`
                                p-1.5 rounded text-[10px] cursor-pointer border-l-2
                                transition-all duration-75 hover:shadow-sm active:scale-[0.98]
                                ${getPriorityColor(task.priority)}
                                ${clickedTaskId === task.id ? 'opacity-50' : ''}
                              `}
                              onClick={() => handleTaskClickOptimized(task)}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">
                                    {task.title}
                                  </div>
                                  {task.case_title && (
                                    <div className="text-[9px] opacity-75 truncate mt-0.5">
                                      {task.case_title}
                                    </div>
                                  )}
                                </div>
                                {getPriorityBadge(task.priority)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-1.5 text-[10px] text-muted-foreground">
                    Sin tareas esta semana
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Lista de tareas próximas */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm md:text-base">Próximas Tareas</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <ScrollArea className="h-[250px] md:h-[350px]">
            <div className="space-y-1.5">
              {filteredTasks
                .filter(task => task.due_date)
                .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
                .slice(0, 15)
                .map(task => {
                  const dueDate = new Date(task.due_date!)
                  const isOverdue = dueDate < new Date() && !isToday(dueDate)
                  
                  return (
                    <div
                      key={task.id}
                      className={`
                        p-2 rounded border cursor-pointer
                        transition-all duration-75 hover:bg-accent/50 hover:shadow-sm active:scale-[0.99]
                        ${isOverdue ? 'border-red-200 bg-red-50/50' : ''}
                        ${clickedTaskId === task.id ? 'opacity-50' : ''}
                      `}
                      onClick={() => handleTaskClickOptimized(task)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1.5 mb-0.5">
                            <h4 className="font-medium text-xs flex-1 line-clamp-2">{task.title}</h4>
                            {getPriorityBadge(task.priority)}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 text-[10px] text-muted-foreground">
                            {task.case_title && (
                              <span className="flex items-center gap-0.5 truncate">
                                <Briefcase className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="truncate">{task.case_title}</span>
                              </span>
                            )}
                            
                            {task.assigned_user && (
                              <span className="flex items-center gap-0.5 truncate">
                                <User className="h-2.5 w-2.5 flex-shrink-0" />
                                <span className="truncate">{task.assigned_user.full_name}</span>
                              </span>
                            )}
                            
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                              <span className="hidden sm:inline">
                                {format(dueDate, 'dd/MM/yyyy HH:mm', { locale: es })}
                              </span>
                              <span className="sm:hidden">
                                {format(dueDate, 'dd/MM/yy HH:mm', { locale: es })}
                              </span>
                            </span>
                          </div>
                        </div>
                        
                        {task.case_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                            className="self-end sm:self-auto text-xs"
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
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No hay tareas programadas
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
})
