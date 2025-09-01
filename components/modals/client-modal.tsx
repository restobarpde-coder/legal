"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Modal } from "@/components/ui/modal"
import { createClient } from "@/lib/supabase/client"
import { Users, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (client: any) => void
}

export function ClientModal({ isOpen, onClose, onSuccess }: ClientModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    notes: ""
  })
  const supabase = createClient()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error("El nombre del cliente es requerido")
      return
    }

    // Validate email if provided
    if (formData.email && !formData.email.includes("@")) {
      toast.error("Por favor ingresa un email válido")
      return
    }

    setLoading(true)

    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        throw new Error("Usuario no autenticado")
      }

      // Prepare client data
      const clientData = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        company: formData.company.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
        created_by: userData.user.id
      }

      // Insert client
      const { data: newClient, error: dbError } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        throw new Error("Error al crear el cliente")
      }

      toast.success("Cliente creado exitosamente")
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        address: "",
        notes: ""
      })
      
      // Close modal and trigger success callback
      onClose()
      if (onSuccess) onSuccess(newClient)

    } catch (error: any) {
      console.error('Error creating client:', error)
      toast.error(error.message || "Error al crear el cliente")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        address: "",
        notes: ""
      })
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo Cliente" description="Crea un nuevo cliente">
      <div className="sm:max-w-2xl">

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name and Company */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Nombre completo del cliente"
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                placeholder="Nombre de la empresa (opcional)"
                disabled={loading}
              />
            </div>
          </div>

          {/* Email and Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="correo@ejemplo.com"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                disabled={loading}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Dirección completa (opcional)"
              disabled={loading}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Información adicional sobre el cliente..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Crear Cliente
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
