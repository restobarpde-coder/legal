"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SearchBar } from "@/components/search-bar"
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal"
import { createClient } from "@/lib/supabase/client"
import { Eye, Edit, MoreHorizontal, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
  users: { full_name: string } | null;
  cases?: { id: string, status: string }[];
};

interface ClientsTableProps {
  initialClients: Client[]
}

export function ClientsTable({ initialClients }: ClientsTableProps) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{id: string, name: string} | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleDelete = async (id: string, name: string) => {
    setDeleteTarget({ id, name })
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    
    console.log('🗑️ Iniciando eliminación de cliente:', deleteTarget)
    setDeleteLoading(true)
    
    try {
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('❌ Usuario no autenticado:', authError)
        toast.error('Debes estar autenticado para eliminar clientes')
        return
      }
      
      console.log('✅ Usuario autenticado:', user.email)
      
      // First, check if client has active cases
      const clientToDelete = clients.find(c => c.id === deleteTarget.id)
      const activeCases = clientToDelete?.cases?.filter(c => c.status === 'active') || []
      
      if (activeCases.length > 0) {
        toast.error(`No se puede eliminar el cliente. Tiene ${activeCases.length} caso(s) activo(s).`)
        setDeleteLoading(false)
        setDeleteModalOpen(false)
        setDeleteTarget(null)
        return
      }

      console.log('🔄 Eliminando cliente...')
      const { data: deletedData, error } = await supabase
        .from('clients')
        .delete()
        .eq('id', deleteTarget.id)
        .select() // Return deleted data to verify

      console.log('📊 Resultado de eliminación cliente:', { data: deletedData, error })

      if (error) {
        console.error('❌ Delete error:', error)
        toast.error(`Error al eliminar el cliente: ${error.message}`)
        return
      }
      
      // Check if anything was actually deleted
      if (!deletedData || deletedData.length === 0) {
        console.warn('⚠️ No se eliminó ningún cliente - posible problema de permisos')
        toast.error('No se pudo eliminar el cliente. Verifica tus permisos.')
        return
      }
      
      console.log('✅ Cliente eliminado exitosamente')
      toast.success('Cliente eliminado exitosamente')
      // Remove client from local state
      setClients(prev => prev.filter(c => c.id !== deleteTarget.id))
      // Refresh the page data
      router.refresh()
      
    } catch (error: any) {
      console.error('❌ Error inesperado al eliminar:', error)
      toast.error(`Error inesperado: ${error.message || 'Error desconocido'}`)
    } finally {
      setDeleteLoading(false)
      setDeleteModalOpen(false)
      setDeleteTarget(null)
    }
  }

  return (
    <>
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
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{client.company || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{client.email || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={(client.cases?.filter(c => c.status === 'active').length || 0) > 0 ? "default" : "outline"}>
                        {client.cases?.filter(c => c.status === 'active').length || 0}
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
        </CardContent>
      </Card>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Cliente"
        description="Esta acción eliminará permanentemente el cliente y toda su información asociada."
        itemName={deleteTarget?.name}
        loading={deleteLoading}
      />
    </>
  )
}
