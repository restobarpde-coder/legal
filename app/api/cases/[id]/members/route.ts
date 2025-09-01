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
    await requireAuth()
    
    const body = await request.json()
    const { userId, role = 'assistant' } = body

    const { error } = await supabase
      .from('case_members')
      .insert({ case_id: caseId, user_id: userId, role })

    if (error) {
      console.error('Error adding case member:', error)
      return NextResponse.json({ error: 'No se pudo agregar el miembro al caso.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in add member API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params
    const supabase = await createClient()
    await requireAuth()
    
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('case_members')
      .delete()
      .eq('case_id', caseId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing case member:', error)
      return NextResponse.json({ error: 'No se pudo remover el miembro del caso.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in remove member API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
