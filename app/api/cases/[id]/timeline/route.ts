import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    const { id: caseId } = await params

    // Verificar que el usuario tiene acceso al caso
    const { data: caseMember } = await supabase
      .from('case_members')
      .select('id')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .single()

    // Verificar si es admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = userData?.role === 'admin'

    if (!caseMember && !isAdmin) {
      return NextResponse.json(
        { error: 'No tienes acceso a este caso' },
        { status: 403 }
      )
    }

    // Primero verificar qué columnas existen en audit_logs
    const { data: testAudit, error: testError } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(1)
    
    console.log('Sample audit log structure:', testAudit?.[0] ? Object.keys(testAudit[0]) : 'No data')
    
    // Obtener eventos de auditoría SOLO para este caso específico
    // Por ahora obtenemos todos y filtramos en JavaScript debido a la complejidad del filtrado JSON
    // En el futuro se podría optimizar con una función SQL personalizada
    const { data: allAuditEvents, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000) // Aumentamos el límite para asegurar que obtenemos todos los eventos del caso

    if (auditError) {
      console.error('Error fetching audit logs:', auditError)
      return NextResponse.json({ error: 'Error fetching timeline' }, { status: 500 })
    }

    console.log(`Fetching timeline for case: ${caseId}`)
    console.log(`Total audit events before filtering: ${allAuditEvents?.length || 0}`)
    
    // Primero intentemos entender la estructura real de los datos
    console.log('Audit events sample:', allAuditEvents?.slice(0, 2))
    
    // Si la tabla audit_logs tiene una estructura diferente,
    // necesitamos adaptarnos a ella
    const auditEvents = (allAuditEvents || []).map(event => {
      // Intentar parsear changed_fields si es un string JSON
      let parsedEvent = { ...event }
      
      // Si changed_fields es un string que contiene JSON, parsearlo
      if (typeof event.changed_fields === 'string' && event.changed_fields.startsWith('{')) {
        try {
          const parsed = JSON.parse(event.changed_fields)
          parsedEvent = {
            ...event,
            ...parsed, // Expandir los campos parseados
            raw_changed_fields: event.changed_fields // Mantener el original
          }
        } catch (e) {
          console.error('Error parsing changed_fields:', e)
        }
      }
      
      return parsedEvent
    }).filter(event => {
      // Doble verificación: filtrar solo eventos relacionados con este caso
      const newDataCaseId = event.new_data?.case_id
      const oldDataCaseId = event.old_data?.case_id
      
      // Para tablas que tienen case_id directo
      if (newDataCaseId === caseId || oldDataCaseId === caseId) {
        return true
      }
      
      // Para la tabla 'cases', verificar que el record_id sea el caso actual
      if (event.table_name === 'cases' && event.record_id === caseId) {
        return true
      }
      
      // Para case_members, verificar en los datos
      if (event.table_name === 'case_members') {
        const memberCaseId = event.new_data?.case_id || event.old_data?.case_id
        return memberCaseId === caseId
      }
      
      return false
    })
    
    console.log(`Events after case filtering: ${auditEvents.length}`)

    // Obtener datos actuales que aún existen (no eliminados)
    const [tasks, notes, documents, timeEntries] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, assigned_user:users!assigned_to(full_name, email)')
        .eq('case_id', caseId),
      supabase
        .from('notes')
        .select('*, creator:users!created_by(full_name, email)')
        .eq('case_id', caseId)
        .eq('is_private', false), // Solo notas públicas
      supabase
        .from('documents')
        .select('*, uploader:users!uploaded_by(full_name, email)')
        .eq('case_id', caseId),
      supabase
        .from('time_entries')
        .select('*, user:users!user_id(full_name, email)')
        .eq('case_id', caseId)
    ])

    // Procesar eventos de auditoría para crear timeline unificado
    const timelineEvents = auditEvents?.map(event => {
      // Detectar soft deletes: cuando se actualiza deleted_at de null a una fecha
      const isSoftDelete = event.operation === 'UPDATE' && 
                          event.changed_fields?.includes('deleted_at') &&
                          event.old_data?.deleted_at === null &&
                          event.new_data?.deleted_at !== null
      
      // Usar la operación real o soft delete
      const effectiveOperation = isSoftDelete ? 'DELETE' : event.operation
      
      const eventData = effectiveOperation === 'DELETE' ? (event.old_data || event.new_data) : event.new_data
      
      // Determinar el tipo de evento y su descripción
      let eventType = 'unknown'
      let title = ''
      let description = ''
      let icon = 'activity'
      let color = 'blue'
      
      switch (event.table_name) {
        case 'tasks':
          eventType = 'task'
          icon = 'check-square'
          if (effectiveOperation === 'INSERT') {
            title = 'Tarea creada'
            description = eventData?.title || 'Sin título'
            color = 'green'
          } else if (effectiveOperation === 'UPDATE') {
            title = 'Tarea actualizada'
            description = eventData?.title || 'Sin título'
            color = 'blue'
            // Si se completó
            if (event.new_data?.status === 'completed' && event.old_data?.status !== 'completed') {
              title = 'Tarea completada'
              color = 'purple'
            }
          } else if (effectiveOperation === 'DELETE') {
            title = 'Tarea eliminada'
            description = `"${eventData?.title || 'Sin título'}" fue eliminada`
            color = 'red'
            icon = 'trash'
          }
          break
          
        case 'notes':
          eventType = 'note'
          icon = 'file-text'
          if (effectiveOperation === 'INSERT') {
            title = 'Nota agregada'
            description = eventData?.title || 'Nota sin título'
            color = 'yellow'
          } else if (effectiveOperation === 'UPDATE') {
            title = 'Nota editada'
            description = eventData?.title || 'Nota sin título'
            color = 'blue'
          } else if (effectiveOperation === 'DELETE') {
            title = 'Nota eliminada'
            description = `"${eventData?.title || 'Nota sin título'}" fue eliminada`
            color = 'red'
            icon = 'trash'
          }
          break
          
        case 'documents':
          eventType = 'document'
          icon = 'paperclip'
          if (effectiveOperation === 'INSERT') {
            title = 'Documento subido'
            description = eventData?.name || 'Documento sin nombre'
            color = 'indigo'
          } else if (effectiveOperation === 'UPDATE' && !isSoftDelete) {
            title = 'Documento actualizado'
            description = eventData?.name || 'Documento sin nombre'
            color = 'blue'
          } else if (effectiveOperation === 'DELETE') {
            title = 'Documento eliminado'
            description = `"${eventData?.name || 'Documento'}" fue eliminado`
            color = 'red'
            icon = 'trash'
          }
          break
          
        case 'time_entries':
          eventType = 'time'
          icon = 'clock'
          if (effectiveOperation === 'INSERT') {
            title = 'Tiempo registrado'
            description = `${eventData?.hours || 0} horas - ${eventData?.description || 'Sin descripción'}`
            color = 'cyan'
          } else if (effectiveOperation === 'UPDATE' && !isSoftDelete) {
            title = 'Tiempo actualizado'
            description = `${eventData?.hours || 0} horas - ${eventData?.description || 'Sin descripción'}`
            color = 'blue'
          } else if (effectiveOperation === 'DELETE') {
            title = 'Registro de tiempo eliminado'
            description = `${eventData?.hours || 0} horas fueron eliminadas`
            color = 'red'
            icon = 'trash'
          }
          break
          
        case 'cases':
          eventType = 'case'
          icon = 'briefcase'
          if (event.operation === 'UPDATE') {
            title = 'Caso actualizado'
            if (event.changed_fields?.includes('status')) {
              title = `Estado cambiado a ${event.new_data?.status}`
              icon = 'activity'
            }
            color = 'purple'
          }
          break
          
        case 'case_members':
          eventType = 'member'
          icon = 'users'
          if (event.operation === 'INSERT') {
            title = 'Miembro agregado al caso'
            color = 'green'
          } else if (event.operation === 'DELETE') {
            title = 'Miembro removido del caso'
            color = 'orange'
          }
          break
      }
      
      return {
        id: event.id,
        type: eventType,
        operation: effectiveOperation, // Usar la operación efectiva (DELETE para soft deletes)
        title,
        description,
        icon,
        color,
        user: {
          id: event.user_id,
          name: event.user_name || 'Sistema',
          email: event.user_email || 'system@audit',
          role: event.user_role
        },
        data: eventData,
        changedFields: isSoftDelete ? null : event.changed_fields, // No mostrar campos para soft deletes
        createdAt: event.created_at,
        isDeleted: effectiveOperation === 'DELETE', // Marcar como eliminado si es DELETE o soft delete
        originalTable: event.table_name,
        recordId: event.record_id
      }
    }) || []

    // Agregar información adicional para items que aún existen
    const enhancedTimeline = timelineEvents.map(event => {
      // Si el item fue eliminado, ya tiene toda la info del audit log
      if (event.isDeleted) {
        return event
      }
      
      // Si aún existe, enriquecer con datos actuales
      let currentData = null
      switch (event.originalTable) {
        case 'tasks':
          currentData = tasks.data?.find(t => t.id === event.recordId)
          break
        case 'notes':
          currentData = notes.data?.find(n => n.id === event.recordId)
          break
        case 'documents':
          currentData = documents.data?.find(d => d.id === event.recordId)
          break
        case 'time_entries':
          currentData = timeEntries.data?.find(t => t.id === event.recordId)
          break
      }
      
      if (currentData) {
        event.currentData = currentData
      }
      
      return event
    })

    // Estadísticas del timeline
    const stats = {
      totalEvents: enhancedTimeline.length,
      deletedItems: enhancedTimeline.filter(e => e.isDeleted).length,
      activeItems: {
        tasks: tasks.data?.length || 0,
        notes: notes.data?.length || 0,
        documents: documents.data?.length || 0,
        timeEntries: timeEntries.data?.length || 0
      },
      recentActivity: enhancedTimeline.slice(0, 5).map(e => ({
        title: e.title,
        user: e.user.name,
        time: e.createdAt
      }))
    }

    return NextResponse.json({
      timeline: enhancedTimeline,
      stats
    })
  } catch (error) {
    console.error('Error in timeline API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
