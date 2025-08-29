"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Edit, Archive } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface Matter {
  id: string
  title: string
  matter_type: string
  status: "active" | "pending" | "closed" | "archived"
  priority: "low" | "medium" | "high" | "urgent"
  start_date: string | null
  created_at: string
  clients: {
    id: string
    first_name: string
    last_name: string
    company_name: string | null
    client_type: "individual" | "company"
  }
  profiles: {
    first_name: string
    last_name: string
  } | null
}

interface MattersTableProps {
  matters: Matter[]
  canManage: boolean
}

export function MattersTable({ matters, canManage }: MattersTableProps) {
  const [archivingId, setArchivingId] = useState<string | null>(null)

  const handleArchive = async (matterId: string) => {
    if (!confirm("¿Estás seguro de que quieres archivar este caso?")) {
      return
    }

    setArchivingId(matterId)
    try {
      const response = await fetch(`/api/matters/${matterId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert("Error al archivar el caso")
      }
    } catch (error) {
      alert("Error al archivar el caso")
    } finally {
      setArchivingId(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  const getClientName = (client: Matter["clients"]) => {
    if (client.client_type === "company") {
      return client.company_name || `${client.first_name} ${client.last_name}`
    }
    return `${client.first_name} ${client.last_name}`
  }

  const getStatusBadge = (status: Matter["status"]) => {
    const variants = {
      active: "default",
      pending: "secondary",
      closed: "outline",
      archived: "destructive",
    } as const

    const labels = {
      active: "Activo",
      pending: "Pendiente",
      closed: "Cerrado",
      archived: "Archivado",
    }

    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  const getPriorityBadge = (priority: Matter["priority"]) => {
    const variants = {
      low: "outline",
      medium: "secondary",
      high: "default",
      urgent: "destructive",
    } as const

    const labels = {
      low: "Baja",
      medium: "Media",
      high: "Alta",
      urgent: "Urgente",
    }

    return <Badge variant={variants[priority]}>{labels[priority]}</Badge>
  }

  if (matters.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se encontraron casos</p>
        {canManage && (
          <Button asChild className="mt-4">
            <Link href="/dashboard/matters/new">Crear Primer Caso</Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>Abogado</TableHead>
            <TableHead>Fecha Inicio</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matters.map((matter) => (
            <TableRow key={matter.id}>
              <TableCell className="font-medium">
                <Link href={`/dashboard/matters/${matter.id}`} className="hover:underline">
                  {matter.title}
                </Link>
              </TableCell>
              <TableCell>{getClientName(matter.clients)}</TableCell>
              <TableCell>{matter.matter_type}</TableCell>
              <TableCell>{getStatusBadge(matter.status)}</TableCell>
              <TableCell>{getPriorityBadge(matter.priority)}</TableCell>
              <TableCell>
                {matter.profiles ? `${matter.profiles.first_name} ${matter.profiles.last_name}` : "Sin asignar"}
              </TableCell>
              <TableCell>{formatDate(matter.start_date)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/matters/${matter.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </Link>
                    </DropdownMenuItem>
                    {canManage && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/matters/${matter.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleArchive(matter.id)}
                          disabled={archivingId === matter.id}
                          className="text-red-600"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          {archivingId === matter.id ? "Archivando..." : "Archivar"}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
