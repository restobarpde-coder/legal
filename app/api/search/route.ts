import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()
    
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    // Search in cases
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('id, title, description')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      //.eq('case_members.user_id', user.id) // This would require a join

    // Search in clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email, company')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
      //.eq('created_by', user.id)

    // Search in documents
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('id, name, description')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      //.eq('uploaded_by', user.id)

    if (casesError || clientsError || documentsError) {
        console.error({casesError, clientsError, documentsError})
      return NextResponse.json({ error: 'Error performing search' }, { status: 500 })
    }

    return NextResponse.json({ 
        cases: cases || [], 
        clients: clients || [], 
        documents: documents || [] 
    })

  } catch (error) {
    console.error('Error in search API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
