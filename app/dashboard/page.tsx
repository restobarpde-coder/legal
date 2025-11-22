import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { Scale, Users, FileText, CheckSquare, AlertCircle, Plus } from "lucide-react"
import Link from "next/link"

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

export default async function DashboardPage() {
  const { cases, tasks, clientsCount, documentsCount } = await getDashboardData()

  const activeCases = cases.filter((c) => c.status === "active").length
  const pendingTasks = tasks.filter((t) => t.status === "pending").length
  const urgentTasks = tasks.filter((t) => t.priority === "urgent").length

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-lg">Resumen de la actividad de tu estudio jurídico</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:scale-[1.02] cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">Casos Activos</CardTitle>
            <Scale className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCases}</div>
            <p className="text-sm text-muted-foreground mt-1">de {cases.length} casos totales</p>
          </CardContent>
        </Card>

        <Card className="hover:scale-[1.02] cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">Clientes</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{clientsCount}</div>
            <p className="text-sm text-muted-foreground mt-1">clientes registrados</p>
          </CardContent>
        </Card>

        <Card className="hover:scale-[1.02] cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">Tareas Pendientes</CardTitle>
            <CheckSquare className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingTasks}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {urgentTasks > 0 && <span className="text-destructive font-semibold">{urgentTasks} urgentes</span>}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:scale-[1.02] cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold">Documentos</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{documentsCount}</div>
            <p className="text-sm text-muted-foreground mt-1">archivos almacenados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent cases */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Casos Recientes</CardTitle>
                <CardDescription className="text-base mt-1">Tus casos más recientes</CardDescription>
              </div>
              <Button asChild size="sm">
                <Link href="/dashboard/cases">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Caso
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {cases.slice(0, 5).map((case_) => (
              <div key={case_.id} className="flex items-center justify-between space-x-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium truncate">{case_.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{case_.clients?.name}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={
                      case_.status === "active" ? "default" : case_.status === "pending" ? "secondary" : "outline"
                    }
                  >
                    {case_.status}
                  </Badge>
                  {case_.priority === "urgent" && <AlertCircle className="h-5 w-5 text-destructive" />}
                </div>
              </div>
            ))}
            {cases.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No hay casos registrados</p>
            )}
          </CardContent>
        </Card>

        {/* Recent tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Tareas Recientes</CardTitle>
                <CardDescription className="text-base mt-1">Tus tareas más recientes</CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/tasks">Ver Todas</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between space-x-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium truncate">{task.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
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
                  {task.priority === "urgent" && <AlertCircle className="h-5 w-5 text-destructive" />}
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No hay tareas registradas</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
