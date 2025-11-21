import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// DELETE - Eliminar una tarea específica de un caso
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: caseId, taskId } = await params
    console.log('=== DELETE TASK FROM CASE START ===')
    console.log('Case ID:', caseId)
    console.log('Task ID:', taskId)

    const supabase = await createClient()
    const user = await requireAuth()
    console.log('User authenticated:', user.id)

    // Verificar que la tarea existe y pertenece al caso
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('case_id, created_by, assigned_to, title')
      .eq('id', taskId)
      .eq('case_id', caseId)
      .single()

    console.log('Existing task:', existingTask)
    console.log('Fetch error:', fetchError)

    if (!existingTask) {
      console.log('Task not found or not in this case')
      return NextResponse.json({ error: 'Tarea no encontrada en este caso' }, { status: 404 })
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

    // También verificar si es miembro del caso
    const { data: caseMember } = await supabase
      .from('case_members')
      .select('role')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .single()

    const isCaseMember = !!caseMember

    console.log('Permission check:', { isAdmin, isLawyer, isOwner, isCaseMember })

    if (!isAdmin && !isLawyer && !isOwner && !isCaseMember) {
      console.log('No permission to delete')
      return NextResponse.json({ error: 'Sin permisos para eliminar esta tarea' }, { status: 403 })
    }

    // Intentar soft delete primero (marcar como eliminado)
    console.log('Attempting soft delete...')
    const { data: softDeleteResult, error: softDeleteError } = await supabase
      .rpc('soft_delete_task', { p_task_id: taskId })

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
      .eq('id', taskId)
      .eq('case_id', caseId)
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
      .eq('id', taskId)
      .eq('case_id', caseId)

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
      .eq('id', taskId)
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

  } catch (error) {
    console.error('=== DELETE TASK FROM CASE ERROR ===', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error del servidor'
    }, { status: 500 })
  }
}

// PATCH - Actualizar una tarea específica de un caso
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: caseId, taskId } = await params
    const supabase = await createClient()
    const user = await requireAuth()
    const body = await request.json()

    // Verificar que la tarea existe y pertenece al caso
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('case_id, created_by, assigned_to, status, due_date')
      .eq('id', taskId)
      .eq('case_id', caseId)
      .single()

    if (!existingTask) {
      return NextResponse.json({ error: 'Tarea no encontrada en este caso' }, { status: 404 })
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
      // Verificar si es miembro del caso
      const { data: caseMember } = await supabase
        .from('case_members')
        .select('id')
        .eq('case_id', caseId)
        .eq('user_id', user.id)
        .single()

      if (!caseMember) {
        return NextResponse.json({ error: 'Sin permisos para editar esta tarea' }, { status: 403 })
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
      .eq('id', taskId)
      .eq('case_id', caseId)
      .select()
      .single()

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ error: 'Error al actualizar la tarea' }, { status: 500 })
    }

    // Send notifications for important changes
    if (data.assigned_to && data.assigned_to !== user.id) {
      const serviceClient = createServiceClient()
      let notificationType = ''
      let notificationMessage = ''
      let shouldNotify = false

      // 1. Reassignment
      if (body.assigned_to && body.assigned_to !== existingTask.assigned_to) {
        notificationType = 'task_assigned'
        notificationMessage = `Se te ha asignado la tarea "${data.title}"`
        shouldNotify = true
      }
      // 2. Due Date Change (if assigned to someone else)
      else if (body.due_date && body.due_date !== existingTask.due_date) {
        notificationType = 'task_updated'
        notificationMessage = `La fecha de vencimiento de "${data.title}" ha cambiado`
        shouldNotify = true
      }
      // 3. Status Change (optional, maybe too noisy, but good for completion)
      else if (body.status === 'completed' && existingTask.status !== 'completed') {
        notificationType = 'task_completed'
        notificationMessage = `La tarea "${data.title}" ha sido completada`
        shouldNotify = true
      }

      if (shouldNotify) {
        // Insert notification record
        const { data: notifData, error: notifError } = await serviceClient
          .from('notifications')
          .insert({
            user_id: data.assigned_to,
            type: notificationType,
            title: 'Actualización de Tarea',
            message: notificationMessage,
            related_entity_type: 'task',
            related_entity_id: data.id,
            metadata: {
              taskTitle: data.title,
              priority: data.priority,
              caseId: data.case_id,
              changeType: notificationType
            }
          })
          .select()
          .single()

        if (!notifError && notifData) {
          // Send Broadcast
          const channelName = `user-notifications-${data.assigned_to}`
          await serviceClient
            .channel(channelName)
            .send({
              type: 'broadcast',
              event: 'new-notification',
              payload: notifData
            })
        }
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating task in case:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
