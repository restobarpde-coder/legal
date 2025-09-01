import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { Plus, Eye, Edit, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SearchBar } from "@/components/search-bar"
import { CaseFilters } from "./case-filters"
import { SuccessToast } from "./success-toast"

type Case = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string;
  end_date: string | null;
  hourly_rate: number | null;
  created_at: string;
  clients: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
  } | null;
  case_members: {
    user_id: string;
    role: string;
  }[];
};

async function getCases(
  searchQuery?: string,
  statusFilter?: string,
  priorityFilter?: string
): Promise<Case[]> {
  const supabase = await createClient()
  await requireAuth()

  let query = supabase
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
    .order("created_at", { ascending: false })

  // Apply search filter
  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
  }

  // Apply status filter
  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter)
  }

  // Apply priority filter
  if (priorityFilter && priorityFilter !== "all") {
    query = query.eq("priority", priorityFilter)
  }

  const { data: cases, error } = await query

  if (error) {
    console.error("Error fetching cases:", error)
    return []
  }

  return cases as Case[] || []
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

function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Activo"
    case "pending":
      return "Pendiente"
    case "closed":
      return "Cerrado"
    case "archived":
      return "Archivado"
    default:
      return status
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

function getPriorityLabel(priority: string) {
  switch (priority) {
    case "urgent":
      return "Urgente"
    case "high":
      return "Alta"
    case "medium":
      return "Media"
    case "low":
      return "Baja"
    default:
      return priority
  }
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string; priority?: string };
}) {
  const resolvedSearchParams = await searchParams
  const searchQuery = resolvedSearchParams?.q || ""
  const statusFilter = resolvedSearchParams?.status || "all"
  const priorityFilter = resolvedSearchParams?.priority || "all"
  const cases = await getCases(searchQuery, statusFilter, priorityFilter)

  return (
    <div className="space-y-6">
      <SuccessToast />
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
            <div className="flex-1">
              <SearchBar placeholder="Buscar por título o descripción..." />
            </div>
            <CaseFilters 
              defaultStatus={statusFilter}
              defaultPriority={priorityFilter}
            />
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
                      <Badge variant={getStatusColor(case_.status)}>{getStatusLabel(case_.status)}</Badge>
                      <Badge className={getPriorityColor(case_.priority)} variant="outline">
                        {getPriorityLabel(case_.priority)}
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
