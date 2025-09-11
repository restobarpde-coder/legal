import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// DELETE - Eliminar un documento específico de un caso
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id: caseId, documentId } = await params
    console.log('=== DELETE DOCUMENT FROM CASE START ===')
    console.log('Case ID:', caseId)
    console.log('Document ID:', documentId)
    
    const supabase = await createClient()
    const user = await requireAuth()
    console.log('User authenticated:', user.id)
    
    // Verificar que el documento existe y pertenece al caso
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('case_id, uploaded_by, name, file_path')
      .eq('id', documentId)
      .eq('case_id', caseId)
      .single()
    
    console.log('Existing document:', existingDoc)
    console.log('Fetch error:', fetchError)
    
    if (!existingDoc) {
      console.log('Document not found or not in this case')
      return NextResponse.json({ error: 'Documento no encontrado en este caso' }, { status: 404 })
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
    const isOwner = existingDoc.uploaded_by === user.id
    
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
      return NextResponse.json({ error: 'Sin permisos para eliminar este documento' }, { status: 403 })
    }
    
    // Intentar soft delete primero (marcar como eliminado)
    console.log('Attempting soft delete...')
    const { data: softDeleteResult, error: softDeleteError } = await supabase
      .rpc('soft_delete_document', { p_document_id: documentId })
    
    console.log('Soft delete response:', { softDeleteResult, softDeleteError })
    
    if (!softDeleteError && softDeleteResult) {
      // Si el soft delete funciona, intentar eliminar el archivo del storage
      if (existingDoc.file_path) {
        console.log('Attempting to delete file from storage:', existingDoc.file_path)
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([existingDoc.file_path])
        
        if (storageError) {
          console.error('Warning: Could not delete file from storage:', storageError)
          // No fallar la operación si el archivo no se puede eliminar
        } else {
          console.log('File deleted from storage successfully')
        }
      }
      
      console.log('=== SOFT DELETE SUCCESS ===')
      return NextResponse.json({ 
        message: 'Documento eliminado correctamente', 
        success: true,
        method: 'soft_delete' 
      }, { status: 200 })
    }
    
    // Si soft delete falla, intentar actualizar deleted_at directamente
    console.log('Soft delete failed, trying direct update...')
    const { error: updateError } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('case_id', caseId)
      .is('deleted_at', null)
    
    console.log('Update deleted_at response:', { error: updateError })
    
    if (!updateError) {
      // Si el update funciona, intentar eliminar el archivo del storage
      if (existingDoc.file_path) {
        console.log('Attempting to delete file from storage:', existingDoc.file_path)
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([existingDoc.file_path])
        
        if (storageError) {
          console.error('Warning: Could not delete file from storage:', storageError)
        } else {
          console.log('File deleted from storage successfully')
        }
      }
      
      console.log('=== UPDATE DELETED_AT SUCCESS ===')
      return NextResponse.json({ 
        message: 'Documento eliminado correctamente', 
        success: true,
        method: 'update_deleted_at' 
      }, { status: 200 })
    }
    
    // Si todo lo anterior falla, intentar delete físico como último recurso
    console.log('Soft delete and update failed, trying hard delete...')
    
    // Primero intentar eliminar el archivo del storage
    if (existingDoc.file_path) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([existingDoc.file_path])
      
      if (storageError) {
        console.error('Error deleting file from storage:', storageError)
      }
    }
    
    // Luego eliminar el registro de la base de datos
    const { error: deleteError, count } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('case_id', caseId)
    
    console.log('Hard delete response:', { error: deleteError, count })
    
    if (deleteError) {
      console.error('Error deleting document:', deleteError)
      return NextResponse.json({ 
        error: 'Error al eliminar el documento', 
        details: deleteError 
      }, { status: 500 })
    }
    
    // Verificar si realmente se eliminó o se marcó como eliminado
    const { data: checkDoc } = await supabase
      .from('documents')
      .select('id, deleted_at')
      .eq('id', documentId)
      .single()
    
    console.log('Document after delete attempt:', checkDoc)
    
    // Si no existe o tiene deleted_at, considerarlo eliminado
    if (!checkDoc || checkDoc.deleted_at) {
      console.log('=== DELETE SUCCESS (document removed or marked as deleted) ===')
      return NextResponse.json({ 
        message: 'Documento eliminado correctamente', 
        success: true,
        method: checkDoc?.deleted_at ? 'soft_delete' : 'hard_delete'
      }, { status: 200 })
    }
    
    // Si aún existe y no está marcado como eliminado, hay un problema
    console.error('WARNING: Document was not deleted!')
    return NextResponse.json({ 
      error: 'El documento no se pudo eliminar', 
      warning: 'Ningún método de eliminación funcionó' 
    }, { status: 500 })
    
  } catch (error) {
    console.error('=== DELETE DOCUMENT FROM CASE ERROR ===', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error del servidor' 
    }, { status: 500 })
  }
}

// PATCH - Actualizar un documento específico de un caso
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id: caseId, documentId } = await params
    const supabase = await createClient()
    const user = await requireAuth()
    const body = await request.json()
    
    // Verificar que el documento existe y pertenece al caso
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('case_id, uploaded_by')
      .eq('id', documentId)
      .eq('case_id', caseId)
      .single()
    
    if (!existingDoc) {
      return NextResponse.json({ error: 'Documento no encontrado en este caso' }, { status: 404 })
    }
    
    // Verificar permisos
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = userData?.role === 'admin'
    const isOwner = existingDoc.uploaded_by === user.id
    
    if (!isAdmin && !isOwner) {
      // Verificar si es miembro del caso
      const { data: caseMember } = await supabase
        .from('case_members')
        .select('id')
        .eq('case_id', caseId)
        .eq('user_id', user.id)
        .single()
      
      if (!caseMember) {
        return NextResponse.json({ error: 'Sin permisos para editar este documento' }, { status: 403 })
      }
    }
    
    // Actualizar el documento
    const { data, error } = await supabase
      .from('documents')
      .update({
        name: body.name,
        description: body.description,
        document_type: body.document_type,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .eq('case_id', caseId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating document:', error)
      return NextResponse.json({ error: 'Error al actualizar el documento' }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating document in case:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
