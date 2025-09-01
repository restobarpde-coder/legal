"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ClientModal } from "@/components/modals/client-modal"

export function ClientPageHeader() {
  const [clientModalOpen, setClientModalOpen] = useState(false)

  const handleClientCreated = (client: any) => {
    // React Query will automatically update the clients list
    // No manual refresh needed
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestiona todos los clientes de tu estudio jurídico.</p>
        </div>
        <Button onClick={() => setClientModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <ClientModal
        isOpen={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSuccess={handleClientCreated}
      />
    </>
  )
}
