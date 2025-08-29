import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { TasksTable } from "@/components/tasks/tasks-table"
import { TasksSearch } from "@/components/tasks/tasks-search"

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    status?: string
    priority?: string
    assigned_to?: string
    matter_id?: string
  }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", data.user.id)
    .single()

  if (!profile) {
    redirect("/auth/login")
  }

  // Build query for tasks
  let query = supabase
    .from("tasks")
    .select(`
      *,
      matters (
        id,
        title,
        clients (
          first_name,
          last_name,
          company_name,
          client_type
        )
      ),
      profiles!tasks_assigned_to_fkey (
        first_name,
        last_name
      )
    `)
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })

  // Add filters
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`)
  }

  if (params.status) {
    query = query.eq("status", params.status)
  }

  if (params.priority) {
    query = query.eq("priority", params.priority)
  }

  if (params.assigned_to) {
    query = query.eq("assigned_to", params.assigned_to)
  }

  if (params.matter_id) {
    query = query.eq("matter_id", params.matter_id)
  }

  const { data: tasks, error: tasksError } = await query

  if (tasksError) {
    console.error("Error fetching tasks:", tasksError)
  }

  // Get team members for filters
  const { data: teamMembers } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("organization_id", profile.organization_id)
    .in("role", ["admin", "lawyer", "assistant"])
    .eq("is_active", true)
    .order("first_name")

  // Get matters for filters
  const { data: matters } = await supabase
    .from("matters")
    .select("id, title")
    .eq("organization_id", profile.organization_id)
    .neq("status", "archived")
    .order("title")

  const canManageTasks = ["admin", "lawyer", "assistant"].includes(profile.role)

  // Calculate statistics
  const pendingTasks = tasks?.filter((t) => t.status === "pending").length || 0
  const inProgressTasks = tasks?.filter((t) => t.status === "in_progress").length || 0
  const completedTasks = tasks?.filter((t) => t.status === "completed").length || 0
  const overdueTasks =
    tasks?.filter((t) => {
      if (!t.due_date || t.status === "completed") return false
      return new Date(t.due_date) < new Date()
    }).length || 0

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">Gestiona las tareas y actividades del estudio</p>
        </div>
        {canManageTasks && (
          <Button asChild>
            <Link href="/dashboard/tasks/new">Nueva Tarea</Link>
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <TasksSearch teamMembers={teamMembers || []} matters={matters || []} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasks}</div>
              <p className="text-xs text-muted-foreground">Por iniciar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressTasks}</div>
              <p className="text-xs text-muted-foreground">Trabajando</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasks}</div>
              <p className="text-xs text-muted-foreground">Finalizadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueTasks}</div>
              <p className="text-xs text-muted-foreground">Requieren atención</p>
            </CardContent>
          </Card>
        </div>

        <TasksTable tasks={tasks || []} canManage={canManageTasks} />
      </div>
    </div>
  )
}
