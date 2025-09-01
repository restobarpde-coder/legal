import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { Plus, Search, Eye, Edit, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SearchBar } from "@/components/search-bar"

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
  users: { full_name: string } | null;
  cases: { id: string, status: string }[];
};

async function getClients(searchQuery?: string): Promise<Client[]> {
  const supabase = await createClient()
  await requireAuth()

  let query = supabase
    .from("clients")
    .select(`
      id,
      name,
      email,
      phone,
      company,
      created_at,
      users ( full_name ),
      cases ( id, status )
    `)
    .order("created_at", { ascending: false })

  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching clients:", error.message)
    // In a real app, you'd want to handle this more gracefully
    // For now, we'll return an empty array and log the error.
    return []
  }

  return data as Client[]
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const resolvedSearchParams = await searchParams
  const searchQuery = resolvedSearchParams?.q || ""
  const clients = await getClients(searchQuery)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestiona todos los clientes de tu estudio jurídico.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <SearchBar placeholder="Buscar por nombre, email o empresa..." />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Compañía</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Casos Activos</TableHead>
                <TableHead className="hidden lg:table-cell">Registrado por</TableHead>
                <TableHead><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No se encontraron clientes.
                    <Button variant="link" asChild>
                      <Link href="/dashboard/clients/new">Crear un nuevo cliente</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{client.company || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{client.email || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={client.cases.filter(c => c.status === 'active').length > 0 ? "default" : "outline"}>
                        {client.cases.filter(c => c.status === 'active').length}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{client.users?.full_name || "N/A"}</TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
