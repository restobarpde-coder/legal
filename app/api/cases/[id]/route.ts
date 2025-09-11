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

    console.log(`Case API called for ID: ${caseId} by user: ${user.id}`)

    // Check if case exists and get basic info
    const { data: caseExists, error: caseError } = await supabase
      .from('cases')
      .select('id, title, created_by, assigned_lawyer')
      .eq('id', caseId)
      .single()

    if (caseError) {
      console.error('Error checking case existence:', caseError)
      if (caseError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log('Case found:', caseExists)

    // Check membership
    const { data: membershipData, error: membershipError } = await supabase
      .from('case_members')
      .select('role')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .single()

    console.log('Membership check:', { membershipData, membershipError })

    // Determine user's role and access
    let userRole = 'none'
    let hasAccess = false

    if (membershipData && !membershipError) {
      userRole = membershipData.role
      hasAccess = true
    } else if (caseExists.created_by === user.id) {
      userRole = 'owner'
      hasAccess = true
    } else if (caseExists.assigned_lawyer === user.id) {
      userRole = 'lawyer'
      hasAccess = true
    }

    if (!hasAccess) {
      console.log('Access denied for user')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log(`User has access with role: ${userRole}`)

    // Fetch case details with related data (simplified to avoid relationship issues)
    console.log('Fetching case details...')
    const { data: caseData, error: caseDetailError } = await supabase
      .from('cases')
      .select(`
        *,
        clients (*)
      `)
      .eq('id', caseId)
      .single()

    if (caseDetailError) {
      console.error('Error fetching case details:', caseDetailError)
      return NextResponse.json({ error: 'Error fetching case details' }, { status: 500 })
    }

    console.log('Case details fetched successfully')
    
    // Fetch case members separately to avoid relationship ambiguity
    const { data: caseMembers, error: membersError } = await supabase
      .from('case_members')
      .select(`
        *,
        users!case_members_user_id_fkey (
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('case_id', caseId)
    
    if (membersError) {
      console.error('Error fetching case members:', membersError)
    } else {
      console.log('Case members fetched successfully')
      // Add case_members to caseData
      caseData.case_members = caseMembers
    }

    // Fetch tasks (excluding soft-deleted)
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
    }

    // Fetch documents (excluding soft-deleted)
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
    }

    // Fetch notes (excluding soft-deleted)
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (notesError) {
      console.error('Error fetching notes:', notesError)
    }

    // Fetch time entries (excluding soft-deleted)
    const { data: timeEntries, error: timeError } = await supabase
      .from('time_entries')
      .select(`
        *,
        users!time_entries_user_id_fkey (
          id,
          full_name
        )
      `)
      .eq('case_id', caseId)
      .is('deleted_at', null)
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
    const canManage = userRole === 'owner' || userRole === 'admin'
    
    console.log('API response being sent:', { caseData: !!caseData, tasks: tasks?.length, canManage })

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
