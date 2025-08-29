"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Clock } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface Task {
  id: string
  title: string
  description: string | null
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  due_date: string | null
  estimated_hours: number | null
  actual_hours: number | null
  created_at: string
  matters: {
    id: string
    title: string
    clients: {
      first_name: string
      last_name: string
      company_name: string | null
      client_type: "individual" | "company"
    }
  } | null
  profiles: {
    first_name: string
    last_name: string
  } | null
}

interface TasksTableProps {
  tasks: Task[]
  canManage: boolean
}

export function TasksTable({ tasks, canManage }: TasksTableProps) {
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())

  const handleStatusChange = async (taskId: string, completed: boolean) => {
    setUpdatingTasks((prev) => new Set(prev).add(taskId))

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: completed ? "completed" : "pending",
        }),
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert("Error al actualizar la tarea")
      }
    } catch (error) {
      alert("Error al actualizar la tarea")
    } finally {
      setUpdatingTasks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarea?")) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert("Error al eliminar la tarea")
      }
    } catch (error) {
      alert("Error al eliminar la tarea")
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleString("es-ES")
  }

  const getClientName = (client: Task["matters"]["clients"]) => {
    if (!client) return ""
    if (client.client_type === "company") {
      return client.company_name || `${client.first_name} ${client.last_name}`
    }
    return `${client.first_name} ${client.last_name}`
  }

  const getStatusBadge = (status: Task["status"]) => {
    const variants = {
      pending: "secondary",
      in_progress: "default",
      completed: "outline",
      cancelled: "destructive",
    } as const

    const labels = {
      pending: "Pendiente",
      in_progress: "En Progreso",
      completed: "Completada",
      cancelled: "Cancelada",
    }

    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  const getPriorityBadge = (priority: Task["priority"]) => {
    const variants = {
      low: "outline",
      medium: "secondary",
      high: "default",
      urgent: "destructive",
    } as const

    const labels = {
      low: "Baja",
      medium: "Media",
      high: "Alta",
      urgent: "Urgente",
    }

    return <Badge variant={variants[priority]}>{labels[priority]}</Badge>
  }

  const isOverdue = (dueDate: string | null, status: Task["status"]) => {
    if (!dueDate || status === "completed") return false
    return new Date(dueDate) < new Date()
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se encontraron tareas</p>
        {canManage && (
          <Button asChild className="mt-4">
            <Link href="/dashboard/tasks/new">Crear Primera Tarea</Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Caso</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>Asignado a</TableHead>
            <TableHead>Fecha Límite</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} className={isOverdue(task.due_date, task.status) ? "bg-red-50" : ""}>
              <TableCell>
                {canManage && (
                  <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={(checked) => handleStatusChange(task.id, checked as boolean)}
                    disabled={updatingTasks.has(task.id)}
                  />
                )}
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {isOverdue(task.due_date, task.status) && <Clock className="h-4 w-4 text-red-500" />}
                  {task.title}
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {task.description.length > 100 ? `${task.description.substring(0, 100)}...` : task.description}
                  </p>
                )}
              </TableCell>
              <TableCell>
                {task.matters ? (
                  <div>
                    <p className="font-medium">{task.matters.title}</p>
                    <p className="text-sm text-muted-foreground">{getClientName(task.matters.clients)}</p>
                  </div>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{getStatusBadge(task.status)}</TableCell>
              <TableCell>{getPriorityBadge(task.priority)}</TableCell>
              <TableCell>
                {task.profiles ? `${task.profiles.first_name} ${task.profiles.last_name}` : "Sin asignar"}
              </TableCell>
              <TableCell>
                <div className={isOverdue(task.due_date, task.status) ? "text-red-600 font-medium" : ""}>
                  {formatDateTime(task.due_date)}
                </div>
              </TableCell>
              <TableCell>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/tasks/${task.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
