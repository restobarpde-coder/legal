"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useCreateTask } from "@/hooks/use-tasks"
import { createClient } from "@/lib/supabase/client"

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
  const [status, setStatus] = useState<"pending" | "in_progress" | "completed" | "cancelled">("pending")
  const [dueDate, setDueDate] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const supabase = createClient()
  
  const createTaskMutation = useCreateTask()

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("El título es requerido")
      return
    }

    createTaskMutation.mutate(
      {
        caseId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        dueDate: dueDate || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Tarea creada exitosamente")
          
          // Reset form
          setTitle("")
          setDescription("")
          setAssignedTo("")
          setPriority("medium")
          setStatus("pending")
          setDueDate("")
          
          // Close modal
          onClose()
          if (onSuccess) {
            onSuccess()
          }
        },
        onError: (error) => {
          toast.error(error.message || "Error al crear la tarea")
        },
      }
    )
  }

  const handleClose = () => {
    if (!createTaskMutation.isPending) {
      setTitle("")
      setDescription("")
      setAssignedTo("")
      setPriority("medium")
      setStatus("pending")
      setDueDate("")
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nueva Tarea" description="Crea una nueva tarea para el caso">
      <div className="sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {createTaskMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {createTaskMutation.error.message || "Error al crear la tarea"}
              </AlertDescription>
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
                disabled={createTaskMutation.isPending}
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
                disabled={createTaskMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Asignar a</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo} disabled={createTaskMutation.isPending}>
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
              <Select 
                value={priority} 
                onValueChange={(value) => setPriority(value as any)}
                disabled={createTaskMutation.isPending}
              >
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

            <div className="space-y-2">
              <Label htmlFor="status">Estado Inicial</Label>
              <Select 
                value={status} 
                onValueChange={(value) => setStatus(value as any)}
                disabled={createTaskMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
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
                disabled={createTaskMutation.isPending}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createTaskMutation.isPending || !title.trim()}>
              {createTaskMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Tarea"
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              disabled={createTaskMutation.isPending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
