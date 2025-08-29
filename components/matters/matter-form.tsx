"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

interface Client {
  id: string
  first_name: string
  last_name: string
  company_name: string | null
  client_type: "individual" | "company"
}

interface Lawyer {
  id: string
  first_name: string
  last_name: string
}

interface MatterFormData {
  client_id: string
  title: string
  description: string
  matter_type: string
  status: "active" | "pending" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  assigned_lawyer: string
  start_date: string
  end_date: string
  estimated_hours: string
  hourly_rate: string
  total_amount: string
}

interface MatterFormProps {
  clients: Client[]
  lawyers: Lawyer[]
  matter?: MatterFormData & { id: string }
  isEditing?: boolean
}

export function MatterForm({ clients, lawyers, matter, isEditing = false }: MatterFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<MatterFormData>({
    client_id: matter?.client_id || "default_client_id",
    title: matter?.title || "default_title",
    description: matter?.description || "default_description",
    matter_type: matter?.matter_type || "default_matter_type",
    status: matter?.status || "pending",
    priority: matter?.priority || "medium",
    assigned_lawyer: matter?.assigned_lawyer || "default_assigned_lawyer",
    start_date: matter?.start_date || "",
    end_date: matter?.end_date || "",
    estimated_hours: matter?.estimated_hours || "",
    hourly_rate: matter?.hourly_rate || "",
    total_amount: matter?.total_amount || "",
  })

  const handleInputChange = (field: keyof MatterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Convert numeric fields
      const submitData = {
        ...formData,
        estimated_hours: formData.estimated_hours ? Number.parseFloat(formData.estimated_hours) : null,
        hourly_rate: formData.hourly_rate ? Number.parseFloat(formData.hourly_rate) : null,
        total_amount: formData.total_amount ? Number.parseFloat(formData.total_amount) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        assigned_lawyer: formData.assigned_lawyer || null,
      }

      const url = isEditing ? `/api/matters/${matter?.id}` : "/api/matters"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        router.push("/dashboard/matters")
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Error al guardar el caso")
      }
    } catch (error) {
      setError("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  const getClientName = (client: Client) => {
    if (client.client_type === "company") {
      return client.company_name || `${client.first_name} ${client.last_name}`
    }
    return `${client.first_name} ${client.last_name}`
  }

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>{isEditing ? "Editar Caso" : "Información del Caso"}</CardTitle>
        <CardDescription>
          {isEditing ? "Modifica la información del caso" : "Completa los datos del nuevo caso legal"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="client_id">Cliente *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => handleInputChange("client_id", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {getClientName(client)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="title">Título del Caso *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Ej: Reclamo de Daños y Perjuicios"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="matter_type">Tipo de Caso *</Label>
                <Input
                  id="matter_type"
                  required
                  value={formData.matter_type}
                  onChange={(e) => handleInputChange("matter_type", e.target.value)}
                  placeholder="Ej: Civil, Penal, Comercial, Familia"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "pending" | "closed") => handleInputChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="closed">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: "low" | "medium" | "high" | "urgent") => handleInputChange("priority", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="assigned_lawyer">Abogado Asignado</Label>
                <Select
                  value={formData.assigned_lawyer}
                  onValueChange={(value) => handleInputChange("assigned_lawyer", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un abogado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default_assigned_lawyer">Sin asignar</SelectItem>
                    {lawyers.map((lawyer) => (
                      <SelectItem key={lawyer.id} value={lawyer.id}>
                        {lawyer.first_name} {lawyer.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Describe los detalles del caso..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_date">Fecha de Inicio</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange("start_date", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date">Fecha de Fin</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange("end_date", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="estimated_hours">Horas Estimadas</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_hours}
                  onChange={(e) => handleInputChange("estimated_hours", e.target.value)}
                  placeholder="40"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="hourly_rate">Tarifa por Hora (ARS)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourly_rate}
                  onChange={(e) => handleInputChange("hourly_rate", e.target.value)}
                  placeholder="15000.00"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="total_amount">Monto Total (ARS)</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_amount}
                  onChange={(e) => handleInputChange("total_amount", e.target.value)}
                  placeholder="600000.00"
                />
              </div>
            </div>
          </div>

          {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (isEditing ? "Guardando..." : "Creando...") : isEditing ? "Guardar Cambios" : "Crear Caso"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/matters">Cancelar</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
