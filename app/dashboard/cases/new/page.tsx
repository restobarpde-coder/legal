import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { createCase } from '../actions'
import { CaseForm } from '../case-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

async function getClients() {
  const supabase = await createClient()
  await requireAuth()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, company')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }

  return clients || []
}

export default async function NewCasePage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const params = await searchParams
  const clients = await getClients()

  if (clients.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/cases">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nuevo Caso</h1>
            <p className="text-muted-foreground">
              Crea un nuevo caso para gestionar asuntos legales de tus clientes.
            </p>
          </div>
        </div>
        
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">No hay clientes registrados</h2>
          <p className="text-muted-foreground mb-4">
            Necesitas tener al menos un cliente registrado antes de crear un caso.
          </p>
          <Button asChild>
            <Link href="/dashboard/clients/new">
              Crear Primer Cliente
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/cases">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Caso</h1>
          <p className="text-muted-foreground">
            Crea un nuevo caso para gestionar asuntos legales de tus clientes.
          </p>
        </div>
      </div>
      
      <CaseForm clients={clients} formAction={createCase} preselectedClientId={params.client} />
    </div>
  )
}
