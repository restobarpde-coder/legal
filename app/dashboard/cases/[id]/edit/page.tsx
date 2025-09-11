import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { updateCase } from '../../actions'
import { CaseForm } from '../../case-form'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

async function getCase(id: string) {
  const supabase = await createClient()
  const user = await requireAuth()

  const { data: case_, error } = await supabase
    .from('cases')
    .select(`
      *,
      case_members!inner (
        user_id,
        role
      )
    `)
    .eq('id', id)
    .eq('case_members.user_id', user.id)
    .single()

  if (error || !case_) {
    return null
  }

  return case_
}

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

export default async function EditCasePage({ params }: { params: { id: string } }) {
  const resolvedParams = await params
  const [caseData, clients] = await Promise.all([
    getCase(resolvedParams.id),
    getClients()
  ])

  if (!caseData) {
    notFound()
  }

  // Transform the case data to match the form schema
  const formattedCase = {
    id: caseData.id,
    title: caseData.title,
    description: caseData.description || '',
    client_id: caseData.client_id,
    counterparty_name: caseData.counterparty_name || '',
    counterparty_lawyer: caseData.counterparty_lawyer || '',
    status: caseData.status,
    priority: caseData.priority,
    start_date: caseData.start_date,
    end_date: caseData.end_date || '',
    estimated_hours: caseData.estimated_hours?.toString() || '',
    hourly_rate: caseData.hourly_rate?.toString() || '',
  }

  // Create bound action with case ID
  const updateCaseWithId = updateCase.bind(null, resolvedParams.id)


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/cases/${resolvedParams.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Caso</h1>
          <p className="text-muted-foreground">
            Actualiza los detalles de "{caseData.title}"
          </p>
        </div>
      </div>
      
      <CaseForm 
        case={formattedCase} 
        clients={clients} 
        formAction={updateCaseWithId} 
      />
    </div>
  )
}
