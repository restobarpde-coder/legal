import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET - Obtener una tarea específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', params.id)
      .single()
    
    if (error) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }
    
    // Verificar permisos
    if (task.case_id) {
      const { data: caseMember } = await supabase
        .from('case_members')
        .select('id')
        .eq('case_id', task.case_id)
        .eq('user_id', user.id)
        .single()
      
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      
      const isAssigned = task.assigned_to === user.id
      
      if (!caseMember && userData?.role !== 'admin' && !isAssigned) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
      }
    }
    
    return NextResponse.json(task)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// PATCH - Actualizar parcialmente una tarea (especialmente el estado)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    const body = await request.json()
    
    // Verificar que la tarea existe
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('case_id, created_by, assigned_to, status')
      .eq('id', id)
      .single()
    
    if (!existingTask) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }
    
    // Verificar permisos
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = userData?.role === 'admin'
    const isOwner = existingTask.created_by === user.id
    const isAssigned = existingTask.assigned_to === user.id
    
    // Para cambiar estado, cualquiera con acceso puede hacerlo
    if (!isAdmin && !isOwner && !isAssigned) {
      // Verificar si es miembro del caso
      const { data: caseMember } = await supabase
        .from('case_members')
        .select('id')
        .eq('case_id', existingTask.case_id)
        .eq('user_id', user.id)
        .single()
      
      if (!caseMember) {
        return NextResponse.json({ error: 'Sin permisos para editar' }, { status: 403 })
      }
    }
    
    // Preparar datos para actualización
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    // Actualizar solo los campos proporcionados
    if (body.status !== undefined) {
      updateData.status = body.status
      
      // Si se está completando la tarea
      if (body.status === 'completed' && existingTask.status !== 'completed') {
        updateData.completed_at = new Date().toISOString()
      } else if (body.status !== 'completed') {
        updateData.completed_at = null
      }
    }
    
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.due_date !== undefined) updateData.due_date = body.due_date
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to
    
    // Actualizar la tarea
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// PUT - Actualizar una tarea
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    const body = await request.json()
    
    // Verificar que la tarea existe
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('case_id, created_by, assigned_to')
      .eq('id', params.id)
      .single()
    
    if (!existingTask) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }
    
    // Verificar permisos
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = userData?.role === 'admin'
    const isOwner = existingTask.created_by === user.id
    const isAssigned = existingTask.assigned_to === user.id
    
    if (!isAdmin && !isOwner && !isAssigned) {
      return NextResponse.json({ error: 'Sin permisos para editar' }, { status: 403 })
    }
    
    // Preparar datos para actualización
    const updateData: any = {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      due_date: body.due_date,
      updated_at: new Date().toISOString()
    }
    
    // Si se está asignando a alguien
    if (body.assigned_to !== undefined) {
      updateData.assigned_to = body.assigned_to
    }
    
    // Si se está completando la tarea
    if (body.status === 'completed' && existingTask.status !== 'completed') {
      updateData.completed_at = new Date().toISOString()
    } else if (body.status !== 'completed') {
      updateData.completed_at = null
    }
    
    // Actualizar la tarea
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// DELETE - Eliminar una tarea
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('=== DELETE TASK START ===')
  console.log('Task ID to delete:', id)
  
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    console.log('User authenticated:', user.id)
    
    // Verificar que la tarea existe
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('case_id, created_by, assigned_to, title')
      .eq('id', id)
      .single()
    
    console.log('Existing task:', existingTask)
    console.log('Fetch error:', fetchError)
    
    if (!existingTask) {
      console.log('Task not found')
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }
    
    // Verificar permisos
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    console.log('User role:', userData?.role)
    const isAdmin = userData?.role === 'admin'
    const isLawyer = userData?.role === 'lawyer'
    const isOwner = existingTask.created_by === user.id
    
    console.log('Permission check:', { isAdmin, isLawyer, isOwner })
    
    if (!isAdmin && !isLawyer && !isOwner) {
      console.log('No permission to delete')
      return NextResponse.json({ error: 'Sin permisos para eliminar' }, { status: 403 })
    }
    
    // Intentar soft delete primero (marcar como eliminado)
    console.log('Attempting soft delete...')
    const { data: softDeleteResult, error: softDeleteError } = await supabase
      .rpc('soft_delete_task', { p_task_id: id })
    
    console.log('Soft delete response:', { softDeleteResult, softDeleteError })
    
    if (!softDeleteError && softDeleteResult) {
      console.log('=== SOFT DELETE SUCCESS ===')
      return NextResponse.json({ 
        message: 'Tarea eliminada correctamente', 
        success: true,
        method: 'soft_delete' 
      }, { status: 200 })
    }
    
    // Si soft delete falla, intentar actualizar deleted_at directamente
    console.log('Soft delete failed, trying direct update...')
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
    
    console.log('Update deleted_at response:', { error: updateError })
    
    if (!updateError) {
      console.log('=== UPDATE DELETED_AT SUCCESS ===')
      return NextResponse.json({ 
        message: 'Tarea eliminada correctamente', 
        success: true,
        method: 'update_deleted_at' 
      }, { status: 200 })
    }
    
    // Si todo lo anterior falla, intentar delete físico como último recurso
    console.log('Soft delete and update failed, trying hard delete...')
    const { error: deleteError, count } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
    
    console.log('Hard delete response:', { error: deleteError, count })
    
    if (deleteError) {
      console.error('Error deleting task:', deleteError)
      return NextResponse.json({ 
        error: 'Error al eliminar la tarea', 
        details: deleteError 
      }, { status: 500 })
    }
    
    // Verificar si realmente se eliminó o se marcó como eliminada
    const { data: checkTask } = await supabase
      .from('tasks')
      .select('id, deleted_at')
      .eq('id', id)
      .single()
    
    console.log('Task after delete attempt:', checkTask)
    
    // Si no existe o tiene deleted_at, considerarlo eliminado
    if (!checkTask || checkTask.deleted_at) {
      console.log('=== DELETE SUCCESS (task removed or marked as deleted) ===')
      return NextResponse.json({ 
        message: 'Tarea eliminada correctamente', 
        success: true,
        method: checkTask?.deleted_at ? 'soft_delete' : 'hard_delete'
      }, { status: 200 })
    }
    
    // Si aún existe y no está marcada como eliminada, hay un problema
    console.error('WARNING: Task was not deleted!')
    return NextResponse.json({ 
      error: 'La tarea no se pudo eliminar', 
      warning: 'Ningún método de eliminación funcionó' 
    }, { status: 500 })
    
    console.log('=== DELETE TASK SUCCESS ===')
    return NextResponse.json({ message: 'Tarea eliminada correctamente', success: true }, { status: 200 })
  } catch (error) {
    console.error('=== DELETE TASK ERROR ===', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error del servidor' }, { status: 500 })
  }
}
