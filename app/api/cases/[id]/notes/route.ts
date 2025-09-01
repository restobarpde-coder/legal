import { createClient } from '@/lib/supabase/server'
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
    const { title, content, isPrivate } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const noteData = {
      title: title?.trim() || null,
      content: content.trim(),
      case_id: caseId,
      client_id: null,
      is_private: isPrivate || false,
      created_by: user.id,
    }

    const { data: note, error } = await supabase
      .from('notes')
      .insert([noteData])
      .select()
      .single()

    if (error) {
      console.error('Error creating note:', error)
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }

    return NextResponse.json({ success: true, note })
  } catch (error) {
    console.error('Error in notes API:', error)
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

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notes:', error)
      return NextResponse.json({ error: 'Error fetching notes' }, { status: 500 })
    }

    return NextResponse.json(notes || [])
  } catch (error) {
    console.error('Error in notes API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
