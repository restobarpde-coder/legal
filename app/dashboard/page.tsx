import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      *,
      organizations (
        name,
        description
      )
    `)
    .eq("id", data.user.id)
    .single()

  const [
    { count: clientsCount },
    { count: mattersCount },
    { count: tasksCount },
    { count: pendingTasksCount },
    { count: documentsCount },
    { count: upcomingEventsCount },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile?.organization_id),
    supabase
      .from("matters")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile?.organization_id),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("organization_id", profile?.organization_id),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile?.organization_id)
      .eq("status", "pending"),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile?.organization_id),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile?.organization_id)
      .gte("start_time", new Date().toISOString())
      .lte("start_time", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const { data: recentTasks } = await supabase
    .from("tasks")
    .select(`
      *,
      matters (title),
      assigned_to:profiles!tasks_assigned_to_fkey (first_name, last_name)
    `)
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })
    .limit(5)

  const { data: recentEvents } = await supabase
    .from("events")
    .select(`
      *,
      matters (title),
      clients (name)
    `)
    .eq("organization_id", profile?.organization_id)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(5)

  const handleSignOut = async () => {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth/login")
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900">Sistema Jurídico</h2>
          <p className="text-sm text-gray-600">{profile?.organizations?.name}</p>
        </div>
        <nav className="mt-6">
          <div className="px-3">
            <div className="space-y-1">
              <a
                href="/dashboard"
                className="bg-blue-50 text-blue-700 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                Dashboard
              </a>
              <a
                href="/dashboard/clients"
                className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                Clientes
              </a>
              <a
                href="/dashboard/matters"
                className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                Casos
              </a>
              <a
                href="/dashboard/tasks"
                className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                Tareas
              </a>
              <a
                href="/dashboard/calendar"
                className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                Calendario
              </a>
              <a
                href="/dashboard/documents"
                className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                Documentos
              </a>
              {profile?.role === "admin" && (
                <a
                  href="/dashboard/admin"
                  className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
                >
                  Administración
                </a>
              )}
            </div>
          </div>
        </nav>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Bienvenido, {profile?.first_name} {profile?.last_name}
              </p>
            </div>
            <form action={handleSignOut}>
              <Button variant="outline" type="submit">
                Cerrar Sesión
              </Button>
            </form>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>Total de clientes activos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clientsCount || 0}</div>
                <p className="text-xs text-muted-foreground">Clientes registrados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Casos Activos</CardTitle>
                <CardDescription>Casos en progreso</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mattersCount || 0}</div>
                <p className="text-xs text-muted-foreground">Casos totales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tareas Pendientes</CardTitle>
                <CardDescription>Tareas por completar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingTasksCount || 0}</div>
                <p className="text-xs text-muted-foreground">de {tasksCount || 0} tareas totales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Próximos Eventos</CardTitle>
                <CardDescription>Esta semana</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingEventsCount || 0}</div>
                <p className="text-xs text-muted-foreground">Eventos programados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentos</CardTitle>
                <CardDescription>Archivos subidos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{documentsCount || 0}</div>
                <p className="text-xs text-muted-foreground">Documentos totales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mi Rol</CardTitle>
                <CardDescription>Nivel de acceso</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold capitalize">{profile?.role}</div>
                <p className="text-xs text-muted-foreground">{profile?.organizations?.name}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tareas Recientes</CardTitle>
                <CardDescription>Últimas tareas creadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTasks?.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-gray-600">
                          {task.matters?.title} • {task.assigned_to?.first_name} {task.assigned_to?.last_name}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          task.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : task.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {task.status === "completed"
                          ? "Completada"
                          : task.status === "in_progress"
                            ? "En Progreso"
                            : "Pendiente"}
                      </span>
                    </div>
                  )) || <p className="text-gray-500 text-sm">No hay tareas recientes</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Próximos Eventos</CardTitle>
                <CardDescription>Eventos programados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentEvents?.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(event.start_time).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          event.type === "hearing"
                            ? "bg-red-100 text-red-800"
                            : event.type === "meeting"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {event.type === "hearing" ? "Audiencia" : event.type === "meeting" ? "Reunión" : "Evento"}
                      </span>
                    </div>
                  )) || <p className="text-gray-500 text-sm">No hay eventos próximos</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
