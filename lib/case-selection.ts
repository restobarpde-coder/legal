import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export type SelectableCase = {
  id: string
  title: string
  client_id: string
  clients: { name: string } | null
}

/**
 * Casos activos donde el usuario es miembro, para poblar selectores.
 * Incluye `client_id` para poder acotar la lista al cliente en contexto.
 */
export async function getCasesForSelection(): Promise<SelectableCase[]> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: userCases, error: memberError } = await supabase
      .from('case_members')
      .select('case_id')
      .eq('user_id', user.id)

    if (memberError) {
      console.error('Error fetching user cases:', memberError)
      return []
    }

    const caseIds = userCases?.map(uc => uc.case_id) ?? []
    if (caseIds.length === 0) return []

    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('id, title, status, client_id, clients(name)')
      .in('id', caseIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (casesError) {
      console.error('Error fetching cases:', casesError)
      return []
    }

    return (cases ?? []).map(c => ({
      id: c.id,
      title: c.title,
      client_id: c.client_id as string,
      clients: Array.isArray(c.clients) && c.clients.length > 0 ? c.clients[0] : null,
    }))
  } catch (error) {
    console.error('Error in getCasesForSelection:', error)
    return []
  }
}
