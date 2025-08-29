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

interface ClientFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  identification_number: string
  client_type: "individual" | "company"
  company_name: string
  notes: string
}

interface ClientFormProps {
  client?: ClientFormData & { id: string }
  isEditing?: boolean
}

export function ClientForm({ client, isEditing = false }: ClientFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<ClientFormData>({
    first_name: client?.first_name || "",
    last_name: client?.last_name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    address: client?.address || "",
    identification_number: client?.identification_number || "",
    client_type: client?.client_type || "individual",
    company_name: client?.company_name || "",
    notes: client?.notes || "",
  })

  const handleInputChange = (field: keyof ClientFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const url = isEditing ? `/api/clients/${client?.id}` : "/api/clients"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push("/dashboard/clients")
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Error al guardar el cliente")
      }
    } catch (error) {
      setError("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{isEditing ? "Editar Cliente" : "Información del Cliente"}</CardTitle>
        <CardDescription>
          {isEditing ? "Modifica la información del cliente" : "Completa los datos del nuevo cliente"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="client_type">Tipo de Cliente</Label>
              <Select
                value={formData.client_type}
                onValueChange={(value: "individual" | "company") => handleInputChange("client_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Persona Física</SelectItem>
                  <SelectItem value="company">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.client_type === "company" && (
              <div className="grid gap-2">
                <Label htmlFor="company_name">Nombre de la Empresa</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange("company_name", e.target.value)}
                  placeholder="Ej: Tech Solutions SRL"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">
                  {formData.client_type === "company" ? "Nombre del Contacto" : "Nombre"}
                </Label>
                <Input
                  id="first_name"
                  required
                  value={formData.first_name}
                  onChange={(e) => handleInputChange("first_name", e.target.value)}
                  placeholder="Nombre"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">
                  {formData.client_type === "company" ? "Apellido del Contacto" : "Apellido"}
                </Label>
                <Input
                  id="last_name"
                  required
                  value={formData.last_name}
                  onChange={(e) => handleInputChange("last_name", e.target.value)}
                  placeholder="Apellido"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+54 11 1234-5678"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="identification_number">
                {formData.client_type === "company" ? "CUIT/CUIL" : "DNI/CUIT"}
              </Label>
              <Input
                id="identification_number"
                value={formData.identification_number}
                onChange={(e) => handleInputChange("identification_number", e.target.value)}
                placeholder={formData.client_type === "company" ? "30-12345678-9" : "12345678"}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Av. Corrientes 1234, CABA"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Información adicional sobre el cliente..."
                rows={3}
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? isEditing
                  ? "Guardando..."
                  : "Creando..."
                : isEditing
                  ? "Guardar Cambios"
                  : "Crear Cliente"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/clients">Cancelar</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
