import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    
    console.log('Fetching tasks for user:', user.id)

    // Primero obtener las tareas donde el usuario es el asignado o el creador
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return NextResponse.json(
        { error: 'Error al obtener las tareas', details: tasksError.message },
        { status: 500 }
      )
    }
    
    console.log(`Found ${tasks?.length || 0} tasks for user ${user.id}`)
    
    // Si no hay tareas, devolver array vacío
    if (!tasks || tasks.length === 0) {
      return NextResponse.json([])
    }

    // Obtener los IDs únicos de casos
    const caseIds = [...new Set(tasks?.map(t => t.case_id) || [])]
    const userIds = [...new Set([
      ...(tasks?.map(t => t.assigned_to).filter(Boolean) || []),
      ...(tasks?.map(t => t.created_by).filter(Boolean) || [])
    ])]

    // Obtener información de los casos
    let casesMap: Record<string, any> = {}
    if (caseIds.length > 0) {
      const { data: cases } = await supabase
        .from('cases')
        .select('id, title, case_number, status')
        .in('id', caseIds)
      
      if (cases) {
        casesMap = Object.fromEntries(cases.map(c => [c.id, c]))
      }
    }

    // Obtener información de los usuarios
    let usersMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds)
      
      if (users) {
        usersMap = Object.fromEntries(users.map(u => [u.id, u]))
      }
    }

    // Formatear las tareas para incluir información adicional
    const formattedTasks = tasks?.map(task => ({
      ...task,
      case_title: casesMap[task.case_id]?.title,
      case_number: casesMap[task.case_id]?.case_number,
      case_status: casesMap[task.case_id]?.status,
      assigned_user: task.assigned_to ? usersMap[task.assigned_to] : null,
      created_by_user: usersMap[task.created_by],
    })) || []

    console.log(`Returning ${formattedTasks.length} formatted tasks`)
    return NextResponse.json(formattedTasks)
  } catch (error) {
    console.error('Error in user tasks API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
