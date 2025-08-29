import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function AdminPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile and check admin role
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

  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  // Get organization users
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })

  // Get system statistics
  const [
    { count: totalUsers },
    { count: totalClients },
    { count: totalMatters },
    { count: totalTasks },
    { count: totalDocuments },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", profile.organization_id),
    supabase.from("matters").select("*", { count: "exact", head: true }).eq("organization_id", profile.organization_id),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("organization_id", profile.organization_id),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id),
  ])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Navigation sidebar */}
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
                className="text-gray-700 hover:bg-gray-50 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
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
              <a
                href="/dashboard/admin"
                className="bg-blue-50 text-blue-700 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                Administración
              </a>
            </div>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Administración</h1>
            <p className="text-gray-600">Gestión de usuarios y configuración del sistema</p>
          </div>

          {/* System statistics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">Total de usuarios</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClients || 0}</div>
                <p className="text-xs text-muted-foreground">Clientes registrados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Casos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMatters || 0}</div>
                <p className="text-xs text-muted-foreground">Casos totales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tareas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTasks || 0}</div>
                <p className="text-xs text-muted-foreground">Tareas creadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDocuments || 0}</div>
                <p className="text-xs text-muted-foreground">Archivos subidos</p>
              </CardContent>
            </Card>
          </div>

          {/* Users management */}
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>Usuarios de la organización y sus roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users?.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {user.first_name?.[0]}
                          {user.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={user.role === "admin" ? "default" : user.role === "lawyer" ? "secondary" : "outline"}
                      >
                        {user.role === "admin" ? "Administrador" : user.role === "lawyer" ? "Abogado" : "Asistente"}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                  </div>
                )) || <p className="text-gray-500">No hay usuarios registrados</p>}
              </div>
            </CardContent>
          </Card>

          {/* Organization info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Información de la Organización</CardTitle>
              <CardDescription>Detalles del estudio jurídico</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nombre</label>
                  <p className="text-gray-900">{profile?.organizations?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Descripción</label>
                  <p className="text-gray-900">{profile?.organizations?.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha de creación</label>
                  <p className="text-gray-900">
                    {new Date(profile?.created_at).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
