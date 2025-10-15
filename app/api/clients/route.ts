import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('q')

    let query = supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        company,
        created_at,
        users!inner ( full_name )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%`)
    }

    const { data: clients, error } = await query

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json(
        { message: 'Error al cargar los clientes' },
        { status: 500 }
      )
    }

    const response = NextResponse.json(clients || [])
    
    // Cache headers para optimizar performance
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=600, stale-while-revalidate=1200'
    )
    response.headers.set('Vary', 'Authorization')
    
    return response
  } catch (error) {
    console.error('Clients API error:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    // Clean up empty strings to null for optional fields
    const clientData = {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      company: body.company || null,
      address: body.address || null,
      notes: body.notes || null,
      created_by: user.id
    }

    const { data: client, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json(
        { message: 'Error al crear el cliente' },
        { status: 500 }
      )
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Create client API error:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
