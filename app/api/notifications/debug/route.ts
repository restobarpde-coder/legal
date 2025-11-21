import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Verificar secret para acceso (solo en desarrollo)
    const debugSecret = request.headers.get('x-debug-secret') || request.nextUrl.searchParams.get('secret')
    const expectedSecret = process.env.CRON_SECRET || 'your-secret-key'
    
    if (debugSecret !== expectedSecret) {
      return NextResponse.json({ 
        error: 'No autorizado',
        hint: 'Usa ?secret=tu-cron-secret o header X-Debug-Secret'
      }, { status: 401 })
    }
    
    const supabase = createServiceClient()

    const now = new Date()
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // 1. Todas las tareas activas
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('id, title, assigned_to, due_date, priority, status, deleted_at')
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .limit(20)

    // 2. Tareas en rango de 7 días
    const { data: tasksInRange } = await supabase
      .from('tasks')
      .select('id, title, assigned_to, due_date, priority, status')
      .is('deleted_at', null)
      .gte('due_date', now.toISOString())
      .lte('due_date', oneWeekFromNow.toISOString())
      .order('due_date', { ascending: true })

    // 3. Tareas que cumplen TODOS los criterios
    const { data: notifiableTasks } = await supabase
      .from('tasks')
      .select('id, title, assigned_to, due_date, priority, status')
      .is('deleted_at', null)
      .not('assigned_to', 'is', null)
      .not('status', 'in', '(completed,cancelled)')
      .gte('due_date', now.toISOString())
      .lte('due_date', oneWeekFromNow.toISOString())
      .order('due_date', { ascending: true })

    // 4. Usuarios disponibles
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .is('deleted_at', null)
      .order('full_name')

    // Calcular horas hasta vencimiento para cada tarea
    const enrichTasks = (tasks: any[]) => {
      return tasks?.map(task => {
        const hoursUntilDue = task.due_date 
          ? (new Date(task.due_date).getTime() - now.getTime()) / (1000 * 60 * 60)
          : null
        
        const issues = []
        if (!task.assigned_to) issues.push('❌ Sin usuario asignado')
        if (task.status === 'completed' || task.status === 'cancelled') {
          issues.push(`❌ Estado: ${task.status}`)
        }
        if (hoursUntilDue && hoursUntilDue < 0) issues.push('❌ Ya venció')
        if (hoursUntilDue && hoursUntilDue > 168) issues.push('❌ Vence en más de 7 días')
        
        return {
          ...task,
          hoursUntilDue: hoursUntilDue ? Math.round(hoursUntilDue * 100) / 100 : null,
          validation: issues.length > 0 ? issues.join(', ') : '✅ Cumple criterios'
        }
      }) || []
    }

    // 5. Estadísticas
    const stats = {
      totalTasks: allTasks?.length || 0,
      tasksInRange: tasksInRange?.length || 0,
      notifiableTasks: notifiableTasks?.length || 0,
      totalUsers: users?.length || 0
    }

    return NextResponse.json({
      timestamp: now.toISOString(),
      stats,
      allTasks: enrichTasks(allTasks || []),
      tasksInRange: enrichTasks(tasksInRange || []),
      notifiableTasks: enrichTasks(notifiableTasks || []),
      users: users?.map(u => ({
        id: u.id,
        name: u.full_name,
        email: u.email,
        role: u.role
      })) || [],
      criteria: {
        assigned_to: 'NOT NULL',
        status: 'NOT IN (completed, cancelled)',
        due_date: `>= ${now.toISOString()} AND <= ${oneWeekFromNow.toISOString()}`,
        deleted_at: 'IS NULL'
      }
    })
  } catch (error) {
    console.error('Error en debug:', error)
    return NextResponse.json({ 
      error: 'Error obteniendo diagnóstico',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
