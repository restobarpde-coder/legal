import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params
    const supabase = await createClient()
    const user = await requireAuth()

    const body = await request.json()
    const { title, description, priority, status, dueDate, assignedTo } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const taskData = {
      title: title.trim(),
      description: description?.trim() || null,
      priority: priority || 'medium',
      status: status || 'pending',
      due_date: dueDate || null,
      case_id: caseId,
      assigned_to: assignedTo || user.id,
      created_by: user.id,
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    // Create notification if assigned to someone else
    if (task.assigned_to && task.assigned_to !== user.id) {
      console.log(`🔔 Attempting to create notification for user ${task.assigned_to} assigned by ${user.id}`)

      // Use service client to bypass RLS policies that might restrict inserting for other users
      const serviceClient = createServiceClient()

      const { data: notifData, error: notifError } = await serviceClient
        .from('notifications')
        .insert({
          user_id: task.assigned_to,
          type: 'task_assigned',
          title: 'Nueva tarea asignada',
          message: `Se te ha asignado la tarea "${task.title}"`,
          related_entity_type: 'task',
          related_entity_id: task.id,
          metadata: {
            taskTitle: task.title,
            priority: task.priority,
            caseId: task.case_id
          }
        })
        .select()

      if (notifError) {
        console.error('❌ Error creating notification:', notifError)
      } else {
        console.log('✅ Notification created successfully:', notifData)

        // Send Broadcast message
        const channelName = `user-notifications-${task.assigned_to}`
        console.log('📡 Sending broadcast to channel:', channelName)
        console.log('📦 Broadcast payload:', notifData[0])

        const status = await serviceClient
          .channel(channelName)
          .send({
            type: 'broadcast',
            event: 'new-notification',
            payload: notifData[0]
          })

        console.log('📡 Broadcast send status:', status)
      }
    } else {
      console.log('ℹ️ No notification needed: Self-assignment or no assignee')
    }

    return NextResponse.json({ success: true, task })
  } catch (error) {
    console.error('Error in tasks API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params
    const supabase = await createClient()
    await requireAuth()

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json({ error: 'Error fetching tasks' }, { status: 500 })
    }

    return NextResponse.json(tasks || [])
  } catch (error) {
    console.error('Error in tasks API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
