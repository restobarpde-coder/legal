import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { MattersTable } from "@/components/matters/matters-table"
import { MattersSearch } from "@/components/matters/matters-search"

export default async function MattersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; priority?: string; client_id?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile to check permissions
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", data.user.id)
    .single()

  if (!profile) {
    redirect("/auth/login")
  }

  // Build query for matters with client information
  let query = supabase
    .from("matters")
    .select(`
      *,
      clients (
        id,
        first_name,
        last_name,
        company_name,
        client_type
      ),
      profiles!matters_assigned_lawyer_fkey (
        first_name,
        last_name
      )
    `)
    .eq("organization_id", profile.organization_id)
    .neq("status", "archived")
    .order("created_at", { ascending: false })

  // Add search filter
  if (params.search) {
    query = query.or(
      `title.ilike.%${params.search}%,description.ilike.%${params.search}%,matter_type.ilike.%${params.search}%`,
    )
  }

  // Add status filter
  if (params.status) {
    query = query.eq("status", params.status)
  }

  // Add priority filter
  if (params.priority) {
    query = query.eq("priority", params.priority)
  }

  // Add client filter
  if (params.client_id) {
    query = query.eq("client_id", params.client_id)
  }

  const { data: matters, error: mattersError } = await query

  if (mattersError) {
    console.error("Error fetching matters:", mattersError)
  }

  // Get clients for the filter dropdown
  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name, company_name, client_type")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("first_name")

  const canManageMatters = ["admin", "lawyer", "assistant"].includes(profile.role)

  // Calculate statistics
  const activeMatters = matters?.filter((m) => m.status === "active").length || 0
  const pendingMatters = matters?.filter((m) => m.status === "pending").length || 0
  const closedMatters = matters?.filter((m) => m.status === "closed").length || 0
  const highPriorityMatters = matters?.filter((m) => m.priority === "high" || m.priority === "urgent").length || 0

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Casos</h1>
          <p className="text-muted-foreground">Gestiona los casos legales de tu estudio</p>
        </div>
        {canManageMatters && (
          <Button asChild>
            <Link href="/dashboard/matters/new">Nuevo Caso</Link>
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <MattersSearch clients={clients || []} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Casos Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeMatters}</div>
              <p className="text-xs text-muted-foreground">En progreso</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingMatters}</div>
              <p className="text-xs text-muted-foreground">Por iniciar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cerrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{closedMatters}</div>
              <p className="text-xs text-muted-foreground">Finalizados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alta Prioridad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{highPriorityMatters}</div>
              <p className="text-xs text-muted-foreground">Requieren atención</p>
            </CardContent>
          </Card>
        </div>

        <MattersTable matters={matters || []} canManage={canManageMatters} />
      </div>
    </div>
  )
}
