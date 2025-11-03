'use client'

import { useRouter } from 'next/navigation'
import { TaskCalendar } from '@/components/task-calendar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, useTransition } from 'react'

interface User {
  id: string
  full_name: string
  email: string
}

export default function CalendarPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isPending, startTransition] = useTransition()

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
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
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
    refetchInterval: 30000, // Refrescar cada 30 segundos
  })

  // Cargar usuarios con React Query
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .order('full_name')

      if (error) throw error
      return data || []
    },
    enabled: !!currentUser,
  })

  const handleTaskClick = (task: any) => {
    // Navegar al caso de la tarea inmediatamente
    if (task.case_id) {
      startTransition(() => {
        router.push(`/dashboard/cases/${task.case_id}`)
      })
    }
  }

  const loading = tasksLoading || usersLoading || !currentUser

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
    <div className="container mx-auto">
      <TaskCalendar
        tasks={tasks}
        currentUserId={currentUser?.id || ''}
        users={users}
        onTaskClick={handleTaskClick}
      />
    </div>
  )
}
