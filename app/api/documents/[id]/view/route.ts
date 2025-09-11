import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET - Visualizar un documento específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const user = await requireAuth()
    
    // Obtener información del documento
    const { data: document, error } = await supabase
      .from('documents')
      .select('*, cases(id, title)')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    
    if (error || !document) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }
    
    // Verificar permisos
    let hasAccess = false
    
    // Si es admin, tiene acceso
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userData?.role === 'admin') {
      hasAccess = true
    } else if (document.case_id) {
      // Si tiene caso asignado, verificar membresía
      const { data: caseMember } = await supabase
        .from('case_members')
        .select('id')
        .eq('case_id', document.case_id)
        .eq('user_id', user.id)
        .single()
      
      hasAccess = !!caseMember
    } else {
      // Si es documento general, verificar si lo subió el usuario
      hasAccess = document.uploaded_by === user.id
    }
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Sin permisos para acceder a este documento' }, { status: 403 })
    }
    
    // Generar URL firmada para visualización (más tiempo que para descarga)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, 1800) // 30 minutos para visualización
    
    if (urlError || !signedUrl) {
      console.error('Error generating signed URL:', urlError)
      return NextResponse.json({ error: 'Error al generar enlace de visualización' }, { status: 500 })
    }
    
    // Retornar información del documento y URL para visualización
    return NextResponse.json({
      id: document.id,
      name: document.name,
      description: document.description,
      document_type: document.document_type,
      mime_type: document.mime_type,
      file_size: document.file_size,
      created_at: document.created_at,
      viewUrl: signedUrl.signedUrl,
      case: document.cases ? {
        id: document.cases.id,
        title: document.cases.title
      } : null,
      canView: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'text/plain'].includes(document.mime_type || ''),
      previewSupported: document.mime_type?.startsWith('image/') || document.mime_type === 'application/pdf'
    })
    
  } catch (error) {
    console.error('Error viewing document:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
