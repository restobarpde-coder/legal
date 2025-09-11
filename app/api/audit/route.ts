import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    
    const searchParams = request.nextUrl.searchParams
    const tableName = searchParams.get('table')
    const recordId = searchParams.get('recordId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const operation = searchParams.get('operation')
    const userId = searchParams.get('userId')
    
    // Build the query
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:users!user_id (
          full_name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (tableName) {
      query = query.eq('table_name', tableName)
    }
    
    if (recordId) {
      query = query.eq('record_id', recordId)
    }
    
    if (operation) {
      query = query.eq('operation', operation)
    }
    
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    
    // Check user permissions
    // Admins can see all, others only their own unless they're case members
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userRole?.role !== 'admin') {
      // For non-admins, filter to show only their own actions
      // or actions on cases they're members of
      query = query.or(`user_id.eq.${user.id}`)
    }
    
    const { data: auditLogs, error } = await query.limit(100)
    
    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json({ error: 'Error fetching audit logs' }, { status: 500 })
    }
    
    return NextResponse.json(auditLogs || [])
  } catch (error) {
    console.error('Error in audit API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Endpoint para verificar integridad de la cadena
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    
    // Solo administradores pueden verificar la integridad
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userRole?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden verificar la integridad' },
        { status: 403 }
      )
    }
    
    // Llamar a la función de verificación
    const { data, error } = await supabase
      .rpc('verify_audit_chain')
    
    if (error) {
      console.error('Error verifying audit chain:', error)
      return NextResponse.json(
        { error: 'Error verificando integridad' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      isValid: data[0]?.is_valid || false,
      brokenAt: data[0]?.broken_at || null,
      errorMessage: data[0]?.error_message || null
    })
  } catch (error) {
    console.error('Error in audit verification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
