import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { ArrowLeft, Calendar, Clock, User, Briefcase, Edit, Trash2, CheckSquare } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

async function getTask(id: string) {
  const supabase = await createClient()
  const user = await requireAuth()

  const { data: task, error } = await supabase
    .from("tasks")
    .select(`
      *,
      cases (
        id,
        title,
        clients (name)
      ),
      assigned_user:users!tasks_assigned_to_fkey (
        id,
        full_name,
        email
      ),
      created_user:users!tasks_created_by_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq("id", id)
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id},assigned_to.is.null`)
    .single()

  if (error || !task) {
    notFound()
  }

  return task
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "default"
    case "in_progress":
      return "secondary"
    case "pending":
      return "outline"
    case "cancelled":
      return "destructive"
    default:
      return "outline"
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "urgent":
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950"
    case "high":
      return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950"
    case "medium":
      return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
    case "low":
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950"
    default:
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950"
  }
}

function getStatusText(status: string) {
  switch (status) {
    case "completed":
      return "Completada"
    case "in_progress":
      return "En Progreso"
    case "pending":
      return "Pendiente"
    case "cancelled":
      return "Cancelada"
    default:
      return "Pendiente"
  }
}

function getPriorityText(priority: string) {
  switch (priority) {
    case "urgent":
      return "Urgente"
    case "high":
      return "Alta"
    case "medium":
      return "Media"
    case "low":
      return "Baja"
    default:
      return "Media"
  }
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const task = await getTask(id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/tasks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
          <p className="text-muted-foreground">Detalles de la tarea</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/tasks/${task.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          <Button variant="destructive" size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Details */}
          <Card>
            <CardHeader>
              <CardTitle>Información de la Tarea</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant={getStatusColor(task.status)}>
                  {getStatusText(task.status)}
                </Badge>
                <Badge className={getPriorityColor(task.priority)} variant="outline">
                  {getPriorityText(task.priority)}
                </Badge>
              </div>
              
              {task.description && (
                <div>
                  <h4 className="font-semibold mb-2">Descripción</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Case Information */}
          {task.cases && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Caso Asociado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="font-semibold">{task.cases.title}</h4>
                  <p className="text-muted-foreground">
                    Cliente: {task.cases.clients?.name}
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/cases/${task.cases.id}`}>
                      Ver Caso
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task Meta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Assigned To */}
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Asignado a</p>
                  <p className="text-sm text-muted-foreground">
                    {task.assigned_user ? task.assigned_user.full_name : "Sin asignar"}
                  </p>
                </div>
              </div>

              {/* Created By */}
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Creado por</p>
                  <p className="text-sm text-muted-foreground">
                    {task.created_user.full_name}
                  </p>
                </div>
              </div>

              {/* Due Date */}
              {task.due_date && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Fecha de vencimiento</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(task.due_date).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Created At */}
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Fecha de creación</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(task.created_at).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>

              {/* Updated At */}
              {task.updated_at && task.updated_at !== task.created_at && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Última actualización</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(task.updated_at).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.status !== "completed" && (
                <Button className="w-full" variant="default">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Marcar como Completada
                </Button>
              )}
              <Button className="w-full" variant="outline" asChild>
                <Link href={`/dashboard/tasks/${task.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Tarea
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
