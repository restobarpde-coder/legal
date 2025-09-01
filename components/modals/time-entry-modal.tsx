"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Modal } from "@/components/ui/modal"
import { createClient } from "@/lib/supabase/client"
import { Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface TimeEntryModalProps {
  isOpen: boolean
  onClose: () => void
  caseId: string
  defaultRate?: number
  onSuccess?: () => void
}

export function TimeEntryModal({ isOpen, onClose, caseId, defaultRate = 0, onSuccess }: TimeEntryModalProps) {
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState("")
  const [hours, setHours] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [billable, setBillable] = useState(true)
  const [rate, setRate] = useState(defaultRate.toString())
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!description.trim()) {
      toast.error("Por favor ingresa una descripción")
      return
    }
    
    if (!hours || Number.parseFloat(hours) <= 0) {
      toast.error("Por favor ingresa un número de horas válido")
      return
    }

    if (!date) {
      toast.error("Por favor selecciona una fecha")
      return
    }

    setLoading(true)

    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        throw new Error("Usuario no autenticado")
      }

      // Prepare time entry data
      const timeEntryData = {
        description: description.trim(),
        hours: Number.parseFloat(hours),
        date: date,
        billable: billable,
        rate: billable && rate ? Number.parseFloat(rate) : null,
        case_id: caseId,
        user_id: userData.user.id
      }

      // Insert time entry
      const { error: dbError } = await supabase
        .from('time_entries')
        .insert(timeEntryData)

      if (dbError) {
        console.error('Database error:', dbError)
        throw new Error("Error al guardar la entrada de tiempo")
      }

      toast.success("Tiempo registrado exitosamente")
      
      // Reset form
      setDescription("")
      setHours("")
      setDate(new Date().toISOString().split('T')[0])
      setBillable(true)
      setRate(defaultRate.toString())
      
      // Close modal and refresh data
      onClose()
      if (onSuccess) onSuccess()

    } catch (error: any) {
      console.error('Error creating time entry:', error)
      toast.error(error.message || "Error al registrar el tiempo")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setDescription("")
      setHours("")
      setDate(new Date().toISOString().split('T')[0])
      setBillable(true)
      setRate(defaultRate.toString())
      onClose()
    }
  }

  const totalBillable = billable && hours && rate ? 
    (Number.parseFloat(hours) * Number.parseFloat(rate)).toFixed(2) : "0.00"

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Registrar Tiempo" description="Registra el tiempo trabajado en el caso">
      <div className="sm:max-w-md">

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción del Trabajo *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el trabajo realizado..."
              rows={3}
              disabled={loading}
              required
            />
          </div>

          {/* Date and Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Horas *</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="ej. 2.5"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Billable */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="billable"
              checked={billable}
              onCheckedChange={(checked) => setBillable(checked as boolean)}
              disabled={loading}
            />
            <Label htmlFor="billable" className="text-sm font-medium">
              Tiempo facturable
            </Label>
          </div>

          {/* Rate (only if billable) */}
          {billable && (
            <div className="space-y-2">
              <Label htmlFor="rate">Tarifa por Hora (USD)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="ej. 150.00"
                disabled={loading}
              />
              {hours && rate && (
                <p className="text-sm text-muted-foreground">
                  Total facturable: <span className="font-medium">${totalBillable}</span>
                </p>
              )}
            </div>
          )}

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
              disabled={loading || !description.trim() || !hours || Number.parseFloat(hours) <= 0}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Registrar Tiempo
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
