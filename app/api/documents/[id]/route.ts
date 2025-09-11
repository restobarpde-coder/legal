import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET - Obtener un documento específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', params.id)
      .single()
    
    if (error) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }
    
    // Verificar permisos
    const { data: caseMember } = await supabase
      .from('case_members')
      .select('id')
      .eq('case_id', document.case_id)
      .eq('user_id', user.id)
      .single()
    
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!caseMember && userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
    
    return NextResponse.json(document)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// PUT - Actualizar un documento
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    const body = await request.json()
    
    // Verificar que el documento existe
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('case_id, uploaded_by')
      .eq('id', params.id)
      .single()
    
    if (!existingDoc) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
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
      return NextResponse.json({ error: 'Sin permisos para editar' }, { status: 403 })
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
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating document:', error)
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// DELETE - Eliminar un documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await requireAuth()
    
    // Verificar que el documento existe
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('case_id, uploaded_by, file_path')
      .eq('id', id)
      .single()
    
    if (!existingDoc) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
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
      return NextResponse.json({ error: 'Sin permisos para eliminar' }, { status: 403 })
    }
    
    // Intentar soft delete primero (marcar como eliminado)
    console.log('Attempting soft delete for document...')
    const { data: softDeleteResult, error: softDeleteError } = await supabase
      .rpc('soft_delete_document', { p_document_id: id })
    
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
      .eq('id', id)
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
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting document:', error)
      return NextResponse.json({ error: 'Error al eliminar', details: error }, { status: 500 })
    }
    
    // Verificar si realmente se eliminó o se marcó como eliminada
    const { data: checkDoc } = await supabase
      .from('documents')
      .select('id, deleted_at')
      .eq('id', id)
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
    
    // Si aún existe y no está marcada como eliminada, hay un problema
    console.error('WARNING: Document was not deleted!')
    return NextResponse.json({ 
      error: 'El documento no se pudo eliminar', 
      warning: 'Ningún método de eliminación funcionó' 
    }, { status: 500 })
    
    if (error) {
      console.error('Error deleting document:', error)
      return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
    }
    
    return NextResponse.json({ message: 'Documento eliminado correctamente', success: true }, { status: 200 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error del servidor' }, { status: 500 })
  }
}
