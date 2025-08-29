"use client"

import type React from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

interface Matter {
  id: string
  title: string
}

interface Client {
  id: string
  first_name: string
  last_name: string
  company_name: string | null
  client_type: "individual" | "company"
}

interface DocumentsSearchProps {
  matters: Matter[]
  clients: Client[]
}

export function DocumentsSearch({ matters, clients }: DocumentsSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [documentType, setDocumentType] = useState(searchParams.get("document_type") || "all")
  const [matterId, setMatterId] = useState(searchParams.get("matter_id") || "all")
  const [clientId, setClientId] = useState(searchParams.get("client_id") || "all")
  const [isConfidential, setIsConfidential] = useState(searchParams.get("is_confidential") || "all")

  const updateSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (documentType !== "all") params.set("document_type", documentType)
    if (matterId !== "all") params.set("matter_id", matterId)
    if (clientId !== "all") params.set("client_id", clientId)
    if (isConfidential !== "all") params.set("is_confidential", isConfidential)

    router.push(`/dashboard/documents?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch("")
    setDocumentType("all")
    setMatterId("all")
    setClientId("all")
    setIsConfidential("all")
    router.push("/dashboard/documents")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      updateSearch()
    }
  }

  const getClientName = (client: Client) => {
    if (client.client_type === "company") {
      return client.company_name || `${client.first_name} ${client.last_name}`
    }
    return `${client.first_name} ${client.last_name}`
  }

  const hasFilters =
    search || documentType !== "all" || matterId !== "all" || clientId !== "all" || isConfidential !== "all"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, descripción o tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
        </div>

        <Button onClick={updateSearch}>Buscar</Button>

        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tipo de documento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="Contrato">Contrato</SelectItem>
            <SelectItem value="Demanda">Demanda</SelectItem>
            <SelectItem value="Sentencia">Sentencia</SelectItem>
            <SelectItem value="Escritura">Escritura</SelectItem>
            <SelectItem value="Informe">Informe</SelectItem>
            <SelectItem value="Correspondencia">Correspondencia</SelectItem>
            <SelectItem value="Otro">Otro</SelectItem>
          </SelectContent>
        </Select>

        <Select value={isConfidential} onValueChange={setIsConfidential}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Confidencialidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Confidencial</SelectItem>
            <SelectItem value="false">Público</SelectItem>
          </SelectContent>
        </Select>

        <Select value={matterId} onValueChange={setMatterId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Caso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los casos</SelectItem>
            {matters.map((matter) => (
              <SelectItem key={matter.id} value={matter.id}>
                {matter.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {getClientName(client)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
