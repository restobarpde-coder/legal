'use client'

import { useRouter } from 'next/navigation'
import { IosCalendar } from '@/components/ios-calendar'
import { TaskModal } from '@/components/modals/task-modal'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Obtener usuario actual
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUser(user)
    }
    getUser()
  }, [])

  // Cargar tareas con React Query
  const { data: tasks = [], isLoading: tasksLoading, refetch } = useQuery({
    queryKey: ['user-tasks'],
    queryFn: async () => {
      const response = await fetch('/api/tasks/user')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al cargar las tareas')
      }
      return response.json()
    },
    enabled: !!currentUser,
  })

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!currentUser) return

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('Task change detected:', payload)
          // Refetch tasks when any change occurs
          refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser, refetch, supabase])

  const handleTaskClick = (task: any) => {
    setSelectedTask(task)
    setSelectedDate(null)
    setIsModalOpen(true)
  }

  const handleDateClick = (date: Date) => {
    setSelectedTask(null)
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
    setSelectedDate(null)
  }

  const handleSuccess = () => {
    refetch()
  }

  const loading = tasksLoading || !currentUser

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando calendario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <IosCalendar
        tasks={tasks}
        onTaskClick={handleTaskClick}
        onDateClick={handleDateClick}
      />

      <TaskModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        caseId={selectedTask?.case_id || ''}
        taskToEdit={selectedTask}
        initialDate={selectedDate}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
