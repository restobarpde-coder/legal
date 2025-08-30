import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { Plus, Search, Eye, Edit, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

async function getCases() {
  const supabase = await createClient()
  const user = await requireAuth()

  const { data: cases, error } = await supabase
    .from("cases")
    .select(`
      *,
      clients (
        id,
        name,
        email,
        company
      ),
      case_members!inner (
        user_id,
        role
      )
    `)
    .eq("case_members.user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching cases:", error)
    return []
  }

  return cases || []
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "default"
    case "pending":
      return "secondary"
    case "closed":
      return "outline"
    case "archived":
      return "destructive"
    default:
      return "outline"
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "urgent":
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950"
    case "high":
      return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950"
    case "medium":
      return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
    case "low":
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950"
    default:
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950"
  }
}

export default async function CasesPage() {
  const cases = await getCases()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Casos</h1>
          <p className="text-muted-foreground">Gestiona todos los casos de tu estudio jurídico</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/cases/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Caso
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar casos..." className="pl-9" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
                <SelectItem value="archived">Archivado</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases list */}
      <div className="grid gap-4">
        {cases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">No hay casos registrados</h3>
                <p className="text-muted-foreground mb-4">Comienza creando tu primer caso</p>
                <Button asChild>
                  <Link href="/dashboard/cases/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primer Caso
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          cases.map((case_) => (
            <Card key={case_.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold truncate">{case_.title}</h3>
                      <Badge variant={getStatusColor(case_.status)}>{case_.status}</Badge>
                      <Badge className={getPriorityColor(case_.priority)} variant="outline">
                        {case_.priority}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-3 line-clamp-2">{case_.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        <strong>Cliente:</strong> {case_.clients?.name}
                        {case_.clients?.company && ` (${case_.clients.company})`}
                      </span>
                      <span>
                        <strong>Inicio:</strong> {new Date(case_.start_date).toLocaleDateString("es-ES")}
                      </span>
                      {case_.hourly_rate && (
                        <span>
                          <strong>Tarifa:</strong> ${case_.hourly_rate.toLocaleString()}/hora
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/cases/${case_.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/cases/${case_.id}/edit`}>
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
