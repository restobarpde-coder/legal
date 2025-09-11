import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET - Obtener una nota específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', params.id)
      .single()
    
    if (error) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
    }
    
    // Verificar permisos
    if (note.case_id) {
      const { data: caseMember } = await supabase
        .from('case_members')
        .select('id')
        .eq('case_id', note.case_id)
        .eq('user_id', user.id)
        .single()
      
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (!caseMember && userData?.role !== 'admin' && note.created_by !== user.id) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
      }
    }
    
    return NextResponse.json(note)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// PUT - Actualizar una nota
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    const body = await request.json()
    
    // Verificar que la nota existe
    const { data: existingNote } = await supabase
      .from('notes')
      .select('case_id, client_id, created_by')
      .eq('id', params.id)
      .single()
    
    if (!existingNote) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
    }
    
    // Verificar permisos
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = userData?.role === 'admin'
    const isOwner = existingNote.created_by === user.id
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Sin permisos para editar' }, { status: 403 })
    }
    
    // Actualizar la nota
    const { data, error } = await supabase
      .from('notes')
      .update({
        title: body.title,
        content: body.content,
        is_private: body.is_private,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating note:', error)
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// DELETE - Eliminar una nota
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await requireAuth()
    
    // Verificar que la nota existe
    const { data: existingNote } = await supabase
      .from('notes')
      .select('case_id, client_id, created_by')
      .eq('id', id)
      .single()
    
    if (!existingNote) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
    }
    
    // Verificar permisos
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = userData?.role === 'admin'
    const isOwner = existingNote.created_by === user.id
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Sin permisos para eliminar' }, { status: 403 })
    }
    
    // Intentar soft delete primero (marcar como eliminado)
    console.log('Attempting soft delete for note...')
    const { data: softDeleteResult, error: softDeleteError } = await supabase
      .rpc('soft_delete_note', { p_note_id: id })
    
    console.log('Soft delete response:', { softDeleteResult, softDeleteError })
    
    if (!softDeleteError && softDeleteResult) {
      console.log('=== SOFT DELETE SUCCESS ===')
      return NextResponse.json({ 
        message: 'Nota eliminada correctamente', 
        success: true,
        method: 'soft_delete' 
      }, { status: 200 })
    }
    
    // Si soft delete falla, intentar actualizar deleted_at directamente
    console.log('Soft delete failed, trying direct update...')
    const { error: updateError } = await supabase
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
    
    console.log('Update deleted_at response:', { error: updateError })
    
    if (!updateError) {
      console.log('=== UPDATE DELETED_AT SUCCESS ===')
      return NextResponse.json({ 
        message: 'Nota eliminada correctamente', 
        success: true,
        method: 'update_deleted_at' 
      }, { status: 200 })
    }
    
    // Si todo lo anterior falla, intentar delete físico como último recurso
    console.log('Soft delete and update failed, trying hard delete...')
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting note:', error)
      return NextResponse.json({ error: 'Error al eliminar', details: error }, { status: 500 })
    }
    
    // Verificar si realmente se eliminó o se marcó como eliminada
    const { data: checkNote } = await supabase
      .from('notes')
      .select('id, deleted_at')
      .eq('id', id)
      .single()
    
    console.log('Note after delete attempt:', checkNote)
    
    // Si no existe o tiene deleted_at, considerarlo eliminado
    if (!checkNote || checkNote.deleted_at) {
      console.log('=== DELETE SUCCESS (note removed or marked as deleted) ===')
      return NextResponse.json({ 
        message: 'Nota eliminada correctamente', 
        success: true,
        method: checkNote?.deleted_at ? 'soft_delete' : 'hard_delete'
      }, { status: 200 })
    }
    
    // Si aún existe y no está marcada como eliminada, hay un problema
    console.error('WARNING: Note was not deleted!')
    return NextResponse.json({ 
      error: 'La nota no se pudo eliminar', 
      warning: 'Ningún método de eliminación funcionó' 
    }, { status: 500 })
    
    if (error) {
      console.error('Error deleting note:', error)
      return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
    }
    
    return NextResponse.json({ message: 'Nota eliminada correctamente', success: true }, { status: 200 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error del servidor' }, { status: 500 })
  }
}
