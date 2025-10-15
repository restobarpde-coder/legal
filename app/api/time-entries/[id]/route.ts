import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET - Obtener un registro de tiempo específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await requireAuth()
    
    const { data: timeEntry, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }
    
    // Verificar permisos
    const { data: caseMember } = await supabase
      .from('case_members')
      .select('id')
      .eq('case_id', timeEntry.case_id)
      .eq('user_id', user.id)
      .single()
    
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isOwner = timeEntry.user_id === user.id
    
    if (!caseMember && userData?.role !== 'admin' && !isOwner) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    
    return NextResponse.json(timeEntry)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// PUT - Actualizar un registro de tiempo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await requireAuth()
    const body = await request.json()
    
    // Verificar que el registro existe
    const { data: existingEntry } = await supabase
      .from('time_entries')
      .select('case_id, user_id')
      .eq('id', id)
      .single()
    
    if (!existingEntry) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }
    
    // Verificar permisos
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = userData?.role === 'admin'
    const isOwner = existingEntry.user_id === user.id
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Sin permisos para editar' }, { status: 403 })
    }
    
    // Actualizar el registro
    const { data, error } = await supabase
      .from('time_entries')
      .update({
        description: body.description,
        hours: body.hours,
        rate: body.rate,
        date: body.date,
        billable: body.billable,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating time entry:', error)
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// DELETE - Eliminar un registro de tiempo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await requireAuth()
    
    // Verificar que el registro existe
    const { data: existingEntry } = await supabase
      .from('time_entries')
      .select('case_id, user_id')
      .eq('id', id)
      .single()
    
    if (!existingEntry) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }
    
    // Verificar permisos
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = userData?.role === 'admin'
    const isOwner = existingEntry.user_id === user.id
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Sin permisos para eliminar' }, { status: 403 })
    }
    
    // Eliminar el registro
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting time entry:', error)
      return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
    }
    
    return NextResponse.json({ message: 'Registro eliminado correctamente' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
