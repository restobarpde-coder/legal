'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TaskCalendar } from '@/components/task-calendar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUser(user)

      // Cargar tareas del usuario
      const tasksResponse = await fetch('/api/tasks/user')
      if (!tasksResponse.ok) {
        const errorData = await tasksResponse.json().catch(() => ({}))
        console.error('Error response:', errorData)
        throw new Error(errorData.error || 'Error al cargar las tareas')
      }
      const tasksData = await tasksResponse.json()
      console.log('Tasks loaded:', tasksData.length, 'tasks')
      setTasks(tasksData)

      // Cargar lista de usuarios para el filtro
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .order('full_name')

      if (usersError) {
        console.error('Error loading users:', usersError)
      } else {
        setUsers(usersData || [])
      }
    } catch (error) {
      console.error('Error loading calendar data:', error)
      toast.error('Error al cargar el calendario')
    } finally {
      setLoading(false)
    }
  }

  const handleTaskClick = (task: any) => {
    // Navegar al caso de la tarea
    if (task.case_id) {
      router.push(`/dashboard/cases/${task.case_id}`)
    }
  }

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
    <div className="container mx-auto py-6 px-4">
      <TaskCalendar
        tasks={tasks}
        currentUserId={currentUser?.id || ''}
        users={users}
        onTaskClick={handleTaskClick}
      />
    </div>
  )
}
