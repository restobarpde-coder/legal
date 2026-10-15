"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SearchBar } from "@/components/search-bar"
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal"
import { Edit, MoreVertical, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useDeleteClient, type Client } from "@/hooks/use-clients"

interface ClientsTableProps {
  clients: Client[]
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function ClientsTable({ clients, searchQuery, onSearchChange }: ClientsTableProps) {
  const router = useRouter()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null)

  const deleteClientMutation = useDeleteClient()

  const handleDelete = async (id: string, name: string) => {
    setDeleteTarget({ id, name })
    setDeleteModalOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return

    const clientToDelete = clients.find(c => c.id === deleteTarget.id)
    const activeCases = clientToDelete?.cases?.filter(c => c.status === 'active') || []

    if (activeCases.length > 0) {
      toast.error(`No se puede eliminar el cliente. Tiene ${activeCases.length} caso(s) activo(s).`)
      setDeleteModalOpen(false)
      setDeleteTarget(null)
      return
    }

    deleteClientMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success('Cliente eliminado exitosamente')
        setDeleteModalOpen(false)
        setDeleteTarget(null)
      },
      onError: (error) => {
        toast.error(error.message || 'Error al eliminar el cliente')
        setDeleteModalOpen(false)
        setDeleteTarget(null)
      }
    })
  }

  const activeCasesCount = (client: Client) => client.cases?.filter(c => c.status === 'active').length || 0

  return (
    <>
      <Card>
        <CardHeader>
          <SearchBar
            placeholder="Buscar por nombre, email o empresa..."
            value={searchQuery}
            onChange={onSearchChange}
          />
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
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
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                    >
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{client.company || "-"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{client.email || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={activeCasesCount(client) > 0 ? "default" : "outline"}>
                          {activeCasesCount(client)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{client.users?.full_name || "N/A"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/clients/${client.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(client.id, client.name)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron clientes.
              </div>
            ) : (
              clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                  className="bg-card border rounded-lg p-4 cursor-pointer active:bg-accent transition-colors hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{client.name}</h3>
                      {client.company && (
                        <p className="text-sm text-muted-foreground truncate">{client.company}</p>
                      )}
                      {client.email && (
                        <p className="text-xs text-muted-foreground truncate mt-1">{client.email}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge variant={activeCasesCount(client) > 0 ? "default" : "outline"} className="text-xs">
                          {activeCasesCount(client)} caso{activeCasesCount(client) !== 1 ? 's' : ''}
                        </Badge>
                        {client.users?.full_name && (
                          <span className="text-xs text-muted-foreground">por {client.users.full_name}</span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/clients/${client.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(client.id, client.name)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Cliente"
        description="Esta acción eliminará permanentemente el cliente y toda su información asociada."
        itemName={deleteTarget?.name}
        loading={deleteClientMutation.isPending}
      />
    </>
  )
}
