import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ClientsTable } from "@/components/clients/clients-table"
import { ClientsSearch } from "@/components/clients/clients-search"

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string }>
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

  // Build query for clients
  let query = supabase
    .from("clients")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  // Add search filter
  if (params.search) {
    query = query.or(
      `first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,email.ilike.%${params.search}%,company_name.ilike.%${params.search}%`,
    )
  }

  // Add type filter
  if (params.type) {
    query = query.eq("client_type", params.type)
  }

  const { data: clients, error: clientsError } = await query

  if (clientsError) {
    console.error("Error fetching clients:", clientsError)
  }

  const canManageClients = ["admin", "lawyer", "assistant"].includes(profile.role)

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gestiona la información de tus clientes</p>
        </div>
        {canManageClients && (
          <Button asChild>
            <Link href="/dashboard/clients/new">Nuevo Cliente</Link>
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <ClientsSearch />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personas Físicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clients?.filter((c) => c.client_type === "individual").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clients?.filter((c) => c.client_type === "company").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nuevos Este Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clients?.filter((c) => {
                  const created = new Date(c.created_at)
                  const now = new Date()
                  return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
                }).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <ClientsTable clients={clients || []} canManage={canManageClients} />
      </div>
    </div>
  )
}
