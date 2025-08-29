"use client"

import type React from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

interface TeamMember {
  id: string
  first_name: string
  last_name: string
}

interface Matter {
  id: string
  title: string
}

interface TasksSearchProps {
  teamMembers: TeamMember[]
  matters: Matter[]
}

export function TasksSearch({ teamMembers, matters }: TasksSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "all")
  const [priority, setPriority] = useState(searchParams.get("priority") || "all")
  const [assignedTo, setAssignedTo] = useState(searchParams.get("assigned_to") || "all")
  const [matterId, setMatterId] = useState(searchParams.get("matter_id") || "all")

  const updateSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (status !== "all") params.set("status", status)
    if (priority !== "all") params.set("priority", priority)
    if (assignedTo !== "all") params.set("assigned_to", assignedTo)
    if (matterId !== "all") params.set("matter_id", matterId)

    router.push(`/dashboard/tasks?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch("")
    setStatus("all")
    setPriority("all")
    setAssignedTo("all")
    setMatterId("all")
    router.push("/dashboard/tasks")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      updateSearch()
    }
  }

  const hasFilters = search || status !== "all" || priority !== "all" || assignedTo !== "all" || matterId !== "all"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por título o descripción..."
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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in_progress">En Progreso</SelectItem>
            <SelectItem value="completed">Completada</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Asignado a" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </SelectItem>
            ))}
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
      </div>
    </div>
  )
}
