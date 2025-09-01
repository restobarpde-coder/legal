import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, getUserProfile } from "@/lib/auth"
import { Scale, Users, FileText, CheckSquare, AlertCircle, Plus } from "lucide-react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardSidebar } from "@/components/dashboard-sidebar"

async function getDashboardData() {
  const supabase = await createClient()
  const user = await requireAuth()

  // Get user's cases
  const { data: cases } = await supabase
    .from("cases")
    .select(`
      *,
      clients (name),
      case_members!inner (user_id)
    `)
    .eq("case_members.user_id", user.id)

  // Get recent tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      *,
      cases (title, clients (name))
    `)
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(5)

  // Get clients count
  const { count: clientsCount } = await supabase.from("clients").select("*", { count: "exact", head: true })

  // Get documents count
  const { count: documentsCount } = await supabase.from("documents").select("*", { count: "exact", head: true })

  return {
    cases: cases || [],
    tasks: tasks || [],
    clientsCount: clientsCount || 0,
    documentsCount: documentsCount || 0,
  }
}

export default async function HomePage() {
  // Require authentication for the home page
  await requireAuth()
  const profile = await getUserProfile()
  
  if (!profile) {
    return <div>Error loading profile</div>
  }

  const { cases, tasks, clientsCount, documentsCount } = await getDashboardData()

  const activeCases = cases.filter((c) => c.status === "active").length
  const pendingTasks = tasks.filter((t) => t.status === "pending").length
  const urgentTasks = tasks.filter((t) => t.priority === "urgent").length

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <DashboardSidebar user={profile} />
      </div>

      {/* Main content */}
      <div className="md:pl-64">
        <DashboardHeader user={profile} />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Welcome section */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Resumen de la actividad de tu estudio jurídico</p>
            </div>

            {/* Stats cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Casos Activos</CardTitle>
                  <Scale className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeCases}</div>
                  <p className="text-xs text-muted-foreground">de {cases.length} casos totales</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clientsCount}</div>
                  <p className="text-xs text-muted-foreground">clientes registrados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tareas Pendientes</CardTitle>
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingTasks}</div>
                  <p className="text-xs text-muted-foreground">
                    {urgentTasks > 0 && <span className="text-destructive font-medium">{urgentTasks} urgentes</span>}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Documentos</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{documentsCount}</div>
                  <p className="text-xs text-muted-foreground">archivos almacenados</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Recent cases */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Casos Recientes</CardTitle>
                      <CardDescription>Tus casos más recientes</CardDescription>
                    </div>
                    <Button asChild size="sm">
                      <Link href="/dashboard/cases">
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Caso
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cases.slice(0, 5).map((case_) => (
                    <div key={case_.id} className="flex items-center justify-between space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{case_.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{case_.clients?.name}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            case_.status === "active" ? "default" : case_.status === "pending" ? "secondary" : "outline"
                          }
                        >
                          {case_.status}
                        </Badge>
                        {case_.priority === "urgent" && <AlertCircle className="h-4 w-4 text-destructive" />}
                      </div>
                    </div>
                  ))}
                  {cases.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay casos registrados</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent tasks */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tareas Recientes</CardTitle>
                      <CardDescription>Tus tareas más recientes</CardDescription>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/dashboard/tasks">Ver Todas</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {task.cases?.title} - {task.cases?.clients?.name}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            task.status === "completed" ? "default" : task.status === "in_progress" ? "secondary" : "outline"
                          }
                        >
                          {task.status}
                        </Badge>
                        {task.priority === "urgent" && <AlertCircle className="h-4 w-4 text-destructive" />}
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay tareas registradas</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
