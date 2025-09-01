"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClientModal } from "@/components/modals/client-modal"
import { Plus } from "lucide-react"

type Client = {
  id: string
  name: string
  company: string | null
}

interface ClientSelectorWithModalProps {
  clients: Client[]
  value: string
  onValueChange: (value: string) => void
  onClientAdded?: (client: Client) => void
  label?: string
  required?: boolean
  error?: string
}

export function ClientSelectorWithModal({ 
  clients, 
  value, 
  onValueChange, 
  onClientAdded,
  label = "Cliente",
  required = false,
  error 
}: ClientSelectorWithModalProps) {
  const [clientModalOpen, setClientModalOpen] = useState(false)
  const [clientList, setClientList] = useState<Client[]>(clients)

  useEffect(() => {
    setClientList(clients)
  }, [clients])

  const handleClientCreated = (newClient: Client) => {
    setClientList(prev => [newClient, ...prev])
    onValueChange(newClient.id)
    if (onClientAdded) {
      onClientAdded(newClient)
    }
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="client_id">
            {label}{required && "*"}
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setClientModalOpen(true)}
            className="h-8 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            Nuevo
          </Button>
        </div>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar cliente" />
          </SelectTrigger>
          <SelectContent>
            {clientList.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name} {client.company && `(${client.company})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>

      <ClientModal
        isOpen={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSuccess={handleClientCreated}
      />
    </>
  )
}
