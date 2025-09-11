'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Eye, Edit, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SearchBar } from "@/components/search-bar"
import { CaseFilters } from "./case-filters"
import { SuccessToast } from "./success-toast"
import { useCases } from "@/hooks/use-cases"
import { useSearchParams, useRouter } from 'next/navigation'

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

type CasesClientProps = {
  userCanCreateCases: boolean;
}

export function CasesClient({ userCanCreateCases }: CasesClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || 'all')

  const { data: cases = [], isLoading, error } = useCases(searchQuery, statusFilter, priorityFilter)

  useEffect(() => {
    const successParam = searchParams.get('success')
    if (successParam === 'case-created' || successParam === 'case-updated') {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      // Remove the success param from the URL without reloading the page
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.delete('success')
      router.replace(`/dashboard/cases?${newParams.toString()}`, { scroll: false })
    }
  }, [searchParams, queryClient, router])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Casos</h1>
            <p className="text-muted-foreground">Cargando casos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Casos</h1>
            <p className="text-muted-foreground text-red-600">Error al cargar los casos</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SuccessToast />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Casos</h1>
          <p className="text-muted-foreground">
            {userCanCreateCases
              ? "Gestiona todos los casos de tu estudio jurídico"
              : "Casos en los que estás asignado"}
          </p>
        </div>
        {userCanCreateCases && (
          <Button asChild>
            <Link href="/dashboard/cases/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Caso
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar 
                placeholder="Buscar por título o descripción..." 
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <CaseFilters
              defaultStatus={statusFilter}
              defaultPriority={priorityFilter}
              onStatusChange={setStatusFilter}
              onPriorityChange={setPriorityFilter}
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
                <p className="text-muted-foreground mb-4">
                  {userCanCreateCases 
                    ? "Comienza creando tu primer caso" 
                    : "No tienes casos asignados"}
                </p>
                {userCanCreateCases && (
                  <Button asChild>
                    <Link href="/dashboard/cases/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primer Caso
                    </Link>
                  </Button>
                )}
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
                    {(case_.counterparty_name || case_.counterparty_lawyer) && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-sm text-muted-foreground">
                        {case_.counterparty_name && (
                          <span>
                            <strong>Contraparte:</strong> {case_.counterparty_name}
                          </span>
                        )}
                        {case_.counterparty_lawyer && (
                          <span>
                            <strong>Abogado Contraparte:</strong> {case_.counterparty_lawyer}
                          </span>
                        )}
                      </div>
                    )}
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
