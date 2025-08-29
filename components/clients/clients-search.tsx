"use client"

import type React from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

export function ClientsSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [type, setType] = useState(searchParams.get("type") || "all") // Updated default value to "all"

  const updateSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (type !== "all") params.set("type", type) // Only set type if it's not "all"

    router.push(`/dashboard/clients?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch("")
    setType("all") // Updated default value to "all"
    router.push("/dashboard/clients")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      updateSearch()
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, email o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10"
          />
        </div>
      </div>

      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Tipo de cliente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="individual">Persona Física</SelectItem>
          <SelectItem value="company">Empresa</SelectItem>
        </SelectContent>
      </Select>

      <Button onClick={updateSearch}>Buscar</Button>

      {(search || type !== "all") && ( // Updated condition to check if type is not "all"
        <Button variant="outline" onClick={clearFilters}>
          <X className="h-4 w-4 mr-2" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
