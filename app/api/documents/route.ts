import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET - Obtener lista de documentos
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()

    // Obtener documentos con información relacionada
    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        *,
        cases (
          id,
          title,
          clients (name)
        ),
        users (
          full_name
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json({ error: 'Error al obtener documentos' }, { status: 500 })
    }

    // Filtrar documentos basado en permisos
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = userData?.role === 'admin'
    
    let filteredDocuments = []
    
    if (isAdmin) {
      // Admin puede ver todos los documentos
      filteredDocuments = documents || []
    } else {
      // Usuario normal solo puede ver documentos de casos donde es miembro o documentos que subió
      
      // Obtener casos donde el usuario es miembro
      const { data: userCases } = await supabase
        .from('case_members')
        .select('case_id')
        .eq('user_id', user.id)
      
      const userCaseIds = userCases?.map(cm => cm.case_id) || []
      
      // Filtrar documentos
      filteredDocuments = (documents || []).filter(doc => {
        // Puede ver si es el que lo subió
        if (doc.uploaded_by === user.id) return true
        
        // Puede ver si es de un caso donde es miembro
        if (doc.case_id && userCaseIds.includes(doc.case_id)) return true
        
        // Puede ver documentos sin caso asignado que subió
        if (!doc.case_id && doc.uploaded_by === user.id) return true
        
        return false
      })
    }

    return NextResponse.json(filteredDocuments)
  } catch (error) {
    console.error('Error in GET /api/documents:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
