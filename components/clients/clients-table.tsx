"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  client_type: "individual" | "company"
  company_name: string | null
  created_at: string
}

interface ClientsTableProps {
  clients: Client[]
  canManage: boolean
}

export function ClientsTable({ clients, canManage }: ClientsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (clientId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este cliente?")) {
      return
    }

    setDeletingId(clientId)
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert("Error al eliminar el cliente")
      }
    } catch (error) {
      alert("Error al eliminar el cliente")
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  const getClientName = (client: Client) => {
    if (client.client_type === "company") {
      return client.company_name || `${client.first_name} ${client.last_name}`
    }
    return `${client.first_name} ${client.last_name}`
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se encontraron clientes</p>
        {canManage && (
          <Button asChild className="mt-4">
            <Link href="/dashboard/clients/new">Crear Primer Cliente</Link>
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
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Fecha de Registro</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{getClientName(client)}</TableCell>
              <TableCell>
                <Badge variant={client.client_type === "individual" ? "default" : "secondary"}>
                  {client.client_type === "individual" ? "Persona" : "Empresa"}
                </Badge>
              </TableCell>
              <TableCell>{client.email || "-"}</TableCell>
              <TableCell>{client.phone || "-"}</TableCell>
              <TableCell>{formatDate(client.created_at)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/clients/${client.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </Link>
                    </DropdownMenuItem>
                    {canManage && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/clients/${client.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(client.id)}
                          disabled={deletingId === client.id}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingId === client.id ? "Eliminando..." : "Eliminar"}
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
