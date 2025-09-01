"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

interface User {
  id: string
  full_name: string
  role: string
}

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  caseId: string
  onSuccess?: () => void
}

export function TaskModal({ isOpen, onClose, caseId, onSuccess }: TaskModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [dueDate, setDueDate] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, role")
      .order("full_name")

    if (error) {
      console.error("Error fetching users:", error)
    } else {
      setUsers(data || [])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError("El título es requerido")
      return
    }

    setLoading(true)
    setError("")

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setError("Usuario no autenticado")
        return
      }

      const taskData = {
        title: title.trim(),
        description: description.trim() || null,
        case_id: caseId,
        assigned_to: assignedTo === "none" || !assignedTo ? null : assignedTo,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        created_by: userData.user.id,
      }

      const { error: dbError } = await supabase
        .from("tasks")
        .insert([taskData])

      if (dbError) {
        setError(dbError.message)
      } else {
        // Reset form
        setTitle("")
        setDescription("")
        setAssignedTo("")
        setPriority("medium")
        setDueDate("")
        setError("")
        
        // Close modal and trigger refresh
        onClose()
        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (err) {
      setError("Error inesperado. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setTitle("")
      setDescription("")
      setAssignedTo("")
      setPriority("medium")
      setDueDate("")
      setError("")
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nueva Tarea" description="Crea una nueva tarea para el caso">
      <div className="sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la tarea"
              required
              disabled={loading}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe los detalles de la tarea..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Asignar a</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Tarea"
            )}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
        </form>
      </div>
    </Modal>
  )
}
