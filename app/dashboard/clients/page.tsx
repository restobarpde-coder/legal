import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { Plus, Search, Eye, Edit, MoreHorizontal, Mail, Phone, Building } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

async function getClients() {
  const supabase = await createClient()
  await requireAuth()

  console.log('Fetching clients...')
  const { data: clients, error } = await supabase
    .from("clients")
    .select(`
      *,
      cases (
        id,
        title,
        status
      )
    `)
    .order("created_at", { ascending: false })

  console.log('Clients query result:', { clients, error })
  console.log('Number of clients found:', clients?.length || 0)

  if (error) {
    console.error("Error fetching clients:", error)
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    return []
  }

  return clients || []
}

export default async function ClientsPage() {
  const clients = await getClients()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestiona todos los clientes de tu estudio jurídico</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buscar Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, email o empresa..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {/* Clients list */}
      <div className="grid gap-4">
        {clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">No hay clientes registrados</h3>
                <p className="text-muted-foreground mb-4">Comienza agregando tu primer cliente</p>
                <Button asChild>
                  <Link href="/dashboard/clients/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Primer Cliente
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold truncate">{client.name}</h3>
                      {client.company && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building className="h-4 w-4" />
                          <span className="truncate">{client.company}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                      {client.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        <strong>Casos:</strong> {client.cases?.length || 0}
                      </span>
                      <span>
                        <strong>Casos Activos:</strong>{" "}
                        {client.cases?.filter((c: any) => c.status === "active").length || 0}
                      </span>
                      <span>
                        <strong>Registrado:</strong> {new Date(client.created_at).toLocaleDateString("es-ES")}
                      </span>
                    </div>

                    {client.notes && <p className="text-muted-foreground mt-2 line-clamp-2">{client.notes}</p>}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/clients/${client.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/clients/${client.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
