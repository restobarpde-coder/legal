import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        phone,
        company,
        address,
        notes,
        created_at,
        created_by,
        users ( full_name ),
        cases ( id, status, title, created_at )
      `)
      .eq('id', (await params).id)
      .single()

    if (error) {
      console.error('Error fetching client:', error)
      return NextResponse.json(
        { message: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Client API error:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    }

    const { data: client, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', (await params).id)
      .select()
      .single()

    if (error) {
      console.error('Error updating client:', error)
      return NextResponse.json(
        { message: 'Error al actualizar el cliente' },
        { status: 500 }
      )
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Update client API error:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // First check if client has active cases
    const { data: activeCases, error: casesError } = await supabase
      .from('cases')
      .select('id, status')
      .eq('client_id', (await params).id)
      .eq('status', 'active')

    if (casesError) {
      console.error('Error checking active cases:', casesError)
      return NextResponse.json(
        { message: 'Error al verificar casos activos' },
        { status: 500 }
      )
    }

    if (activeCases && activeCases.length > 0) {
      return NextResponse.json(
        { message: `No se puede eliminar el cliente. Tiene ${activeCases.length} caso(s) activo(s).` },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', (await params).id)

    if (error) {
      console.error('Error deleting client:', error)
      return NextResponse.json(
        { message: 'Error al eliminar el cliente' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Cliente eliminado exitosamente' })
  } catch (error) {
    console.error('Delete client API error:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
