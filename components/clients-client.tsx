"use client"

import { useState } from "react"
import { ClientPageHeader } from "@/app/dashboard/clients/client-page-header"
import { ClientsTable } from "@/app/dashboard/clients/clients-table"
import { useClients } from "@/hooks/use-clients"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function ClientsClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const { data: clients, isLoading, error } = useClients(searchQuery)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando clientes...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al cargar los clientes: {error.message}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <ClientPageHeader />
      <ClientsTable 
        clients={clients || []} 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </div>
  )
}
