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
import { useCreateTask, useUpdateTask } from "@/hooks/use-tasks"
import { createClient } from "@/lib/supabase/client"

interface User {
  id: string
  full_name: string
  role: string
}

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  caseId?: string
  onSuccess?: () => void
  taskToEdit?: any
  initialDate?: Date | null
}

export function TaskModal({ isOpen, onClose, caseId, onSuccess, taskToEdit, initialDate }: TaskModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [status, setStatus] = useState<"pending" | "in_progress" | "completed" | "cancelled">("pending")
  const [dueDate, setDueDate] = useState("")
  const [selectedCaseId, setSelectedCaseId] = useState(caseId || "")
  const [users, setUsers] = useState<User[]>([])
  const [cases, setCases] = useState<any[]>([])
  const supabase = createClient()

  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      if (!caseId) {
        fetchCases()
      }

      if (taskToEdit) {
        setTitle(taskToEdit.title)
        setDescription(taskToEdit.description || "")
        setAssignedTo(taskToEdit.assigned_to || "none")
        setPriority(taskToEdit.priority)
        setStatus(taskToEdit.status)
        setDueDate(taskToEdit.due_date ? new Date(taskToEdit.due_date).toISOString().slice(0, 16) : "")
        setSelectedCaseId(taskToEdit.case_id)
      } else {
        // Reset form for new task
        setTitle("")
        setDescription("")
        setAssignedTo("")
        setPriority("medium")
        setStatus("pending")
        // Set initial date if provided, otherwise empty
        if (initialDate) {
          // Set time to 09:00 by default for clicked dates
          const date = new Date(initialDate)
          date.setHours(9, 0, 0, 0)
          // Adjust for timezone offset to show correct local time in input
          const offset = date.getTimezoneOffset() * 60000
          const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16)
          setDueDate(localISOTime)
        } else {
          setDueDate("")
        }
        setSelectedCaseId(caseId || "")
      }
    }
  }, [isOpen, taskToEdit, caseId, initialDate])

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

  const fetchCases = async () => {
    const { data, error } = await supabase
      .from("cases")
      .select("id, title, case_number")
      .neq('status', 'closed') // Only active cases
      .order("title")

    if (error) {
      console.error("Error fetching cases:", error)
    } else {
      setCases(data || [])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("El título es requerido")
      return
    }

    if (!selectedCaseId) {
      toast.error("Debes seleccionar un caso")
      return
    }

    const commonData = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      status,
      dueDate: dueDate || undefined,
      assignedTo: assignedTo === "none" ? null : assignedTo,
    }

    if (taskToEdit) {
      updateTaskMutation.mutate(
        {
          caseId: taskToEdit.case_id,
          taskId: taskToEdit.id,
          updates: {
            title: commonData.title,
            description: commonData.description,
            priority: commonData.priority,
            status: commonData.status,
            due_date: commonData.dueDate,
            assigned_to: commonData.assignedTo,
          }
        },
        {
          onSuccess: () => {
            toast.success("Tarea actualizada exitosamente")
            onClose()
            if (onSuccess) onSuccess()
          },
          onError: (error) => {
            toast.error(error.message || "Error al actualizar la tarea")
          }
        }
      )
    } else {
      createTaskMutation.mutate(
        {
          caseId: selectedCaseId,
          ...commonData
        },
        {
          onSuccess: () => {
            toast.success("Tarea creada exitosamente")
            setTitle("")
            setDescription("")
            setAssignedTo("")
            setPriority("medium")
            setStatus("pending")
            setDueDate("")
            onClose()
            if (onSuccess) onSuccess()
          },
          onError: (error) => {
            toast.error(error.message || "Error al crear la tarea")
          },
        }
      )
    }
  }

  const handleClose = () => {
    if (!createTaskMutation.isPending && !updateTaskMutation.isPending) {
      setTitle("")
      setDescription("")
      setAssignedTo("")
      setPriority("medium")
      setStatus("pending")
      setDueDate("")
      onClose()
    }
  }

  const isPending = createTaskMutation.isPending || updateTaskMutation.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={taskToEdit ? "Editar Tarea" : "Nueva Tarea"}
      description={taskToEdit ? "Modifica los detalles de la tarea" : "Crea una nueva tarea para el caso"}
    >
      <div className="sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {(createTaskMutation.error || updateTaskMutation.error) && (
            <Alert variant="destructive">
              <AlertDescription>
                {(createTaskMutation.error || updateTaskMutation.error)?.message || "Error al guardar la tarea"}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            {!caseId && !taskToEdit && (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="case">Caso *</Label>
                <Select value={selectedCaseId} onValueChange={setSelectedCaseId} disabled={isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un caso" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.case_number} - {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="col-span-2 space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título de la tarea"
                required
                disabled={isPending}
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
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Asignar a</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo} disabled={isPending}>
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
                disabled={isPending}
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
              <Label htmlFor="status">Estado</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as any)}
                disabled={isPending}
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
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isPending || !title.trim() || (!selectedCaseId && !taskToEdit)}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                taskToEdit ? "Actualizar Tarea" : "Crear Tarea"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
