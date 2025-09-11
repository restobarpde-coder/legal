import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()

    const today = new Date().toISOString().split('T')[0]

    // Get case IDs where the user is a member
    const { data: caseMembers, error: memberError } = await supabase
      .from('case_members')
      .select('case_id')
      .eq('user_id', user.id)

    if (memberError) {
      console.error('Error fetching case memberships for notifications:', memberError)
      return NextResponse.json({ error: 'Error fetching case memberships' }, { status: 500 })
    }

    const caseIds = caseMembers.map(cm => cm.case_id)

    if (caseIds.length === 0) {
      return NextResponse.json({ notifications: [] })
    }

    // Get tasks due today for those cases
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .in('case_id', caseIds)
      .eq('due_date', today)

    if (tasksError) {
      console.error('Error fetching tasks for notifications:', tasksError)
      return NextResponse.json({ error: 'Error fetching tasks' }, { status: 500 })
    }

    // For now, we only have tasks as notifications
    const notifications = (tasks || []).map(task => ({
      id: `task-${task.id}`,
      type: 'task',
      title: task.title,
      dueDate: task.due_date,
      caseId: task.case_id,
    }));

    return NextResponse.json({ notifications })

  } catch (error) {
    console.error('Error in notifications API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
