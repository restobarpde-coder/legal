import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    
    const searchParams = request.nextUrl.searchParams
    const searchQuery = searchParams.get('q') || ''
    const statusFilter = searchParams.get('status') || 'all'
    const priorityFilter = searchParams.get('priority') || 'all'

    // First, get case IDs where the current user is a member
    const { data: userCases, error: memberError } = await supabase
      .from('case_members')
      .select('case_id')
      .eq('user_id', user.id)

    if (memberError) {
      console.error('Error fetching user case memberships:', memberError)
      return NextResponse.json({ error: 'Error fetching case memberships' }, { status: 500 })
    }

    // Extract case IDs
    const caseIds = userCases?.map(uc => uc.case_id) || []
    
    // If user is not a member of any case, return empty array
    if (caseIds.length === 0) {
      return NextResponse.json([])
    }

    // Now query cases with those IDs
    let query = supabase
      .from('cases')
      .select(`
        *,
        clients (
          id,
          name,
          email,
          company
        ),
        case_members (
          user_id,
          role
        )
      `)
      .in('id', caseIds)
      .order('created_at', { ascending: false })

    // Apply search filter
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    // Apply priority filter
    if (priorityFilter && priorityFilter !== 'all') {
      query = query.eq('priority', priorityFilter)
    }

    const { data: cases, error } = await query

    if (error) {
      console.error('Error fetching cases:', error)
      return NextResponse.json({ error: 'Error fetching cases' }, { status: 500 })
    }

    return NextResponse.json(cases || [])
  } catch (error) {
    console.error('Error in cases API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
