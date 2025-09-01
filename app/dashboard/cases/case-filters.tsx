"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CaseFiltersProps {
  defaultStatus: string
  defaultPriority: string
}

export function CaseFilters({ defaultStatus, defaultPriority }: CaseFiltersProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value === "all") {
      params.delete("status")
    } else {
      params.set("status", value)
    }
    replace(`${pathname}?${params.toString()}`)
  }

  const handlePriorityChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value === "all") {
      params.delete("priority")
    } else {
      params.set("priority", value)
    }
    replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Select defaultValue={defaultStatus} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="active">Activo</SelectItem>
          <SelectItem value="pending">Pendiente</SelectItem>
          <SelectItem value="closed">Cerrado</SelectItem>
          <SelectItem value="archived">Archivado</SelectItem>
        </SelectContent>
      </Select>
      
      <Select defaultValue={defaultPriority} onValueChange={handlePriorityChange}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Prioridad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las prioridades</SelectItem>
          <SelectItem value="urgent">Urgente</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
          <SelectItem value="medium">Media</SelectItem>
          <SelectItem value="low">Baja</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
