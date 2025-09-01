import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params
    const supabase = await createClient()
    const user = await requireAuth()

    // First verify user has access to this case
    const { data: membership, error: membershipError } = await supabase
      .from('case_members')
      .select('role')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch case details with all related data
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select(`
        *,
        clients (*),
        case_members (
          role,
          user_id,
          users (
            id,
            full_name,
            email,
            role
          )
        )
      `)
      .eq('id', caseId)
      .single()

    if (caseError) {
      console.error('Error fetching case:', caseError)
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Fetch tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
    }

    // Fetch documents
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
    }

    // Fetch notes
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (notesError) {
      console.error('Error fetching notes:', notesError)
    }

    // Fetch time entries
    const { data: timeEntries, error: timeError } = await supabase
      .from('time_entries')
      .select(`
        *,
        users (
          id,
          full_name
        )
      `)
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (timeError) {
      console.error('Error fetching time entries:', timeError)
    }

    // Fetch assignable users (users not already members)
    const memberUserIds = caseData.case_members?.map(m => m.user_id) || []
    let assignableUsers = []
    
    if (memberUserIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .not('id', 'in', `(${memberUserIds.join(',')})`)
      
      if (!usersError) {
        assignableUsers = users || []
      }
    } else {
      // If no members, get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, role')
      
      if (!usersError) {
        assignableUsers = users || []
      }
    }


    // Determine if user can manage this case
    const canManage = membership.role === 'owner' || membership.role === 'admin'

    return NextResponse.json({
      caseData,
      tasks: tasks || [],
      documents: documents || [],
      notes: notes || [],
      timeEntries: timeEntries || [],
      assignableUsers: assignableUsers || [],
      canManage,
    })
  } catch (error) {
    console.error('Error in case details API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
