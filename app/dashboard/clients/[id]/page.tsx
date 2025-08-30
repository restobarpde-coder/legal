import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { notFound } from "next/navigation"
import { ArrowLeft, Edit, Mail, Phone, Building, MapPin, FileText, Scale, Plus } from "lucide-react"
import Link from "next/link"

async function getClient(id: string) {
  const supabase = await createClient()
  await requireAuth()

  const { data: client, error } = await supabase
    .from("clients")
    .select(`
      *,
      cases (
        id,
        title,
        status,
        priority,
        start_date,
        end_date,
        created_at
      ),
      notes (
        id,
        title,
        content,
        created_at,
        users (
          full_name
        )
      )
    `)
    .eq("id", id)
    .single()

  if (error || !client) {
    return null
  }

  return client
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "default"
    case "pending":
      return "secondary"
    case "closed":
      return "outline"
    case "archived":
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

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id)

  if (!client) {
    notFound()
  }

  const activeCases = client.cases?.filter((c: any) => c.status === "active") || []
  const totalCases = client.cases?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            {client.company && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Building className="h-5 w-5" />
                <span className="text-lg">{client.company}</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground">
            Cliente desde {new Date(client.created_at).toLocaleDateString("es-ES")}
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/clients/${client.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {/* Client details */}
          <Card>
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {client.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email</p>
                      <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                        {client.email}
                      </a>
                    </div>
                  </div>
                )}

                {client.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Teléfono</p>
                      <a href={`tel:${client.phone}`} className="text-primary hover:underline">
                        {client.phone}
                      </a>
                    </div>
                  </div>
                )}

                {client.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Dirección</p>
                      <p className="text-muted-foreground whitespace-pre-line">{client.address}</p>
                    </div>
                  </div>
                )}
              </div>

              {client.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="font-medium mb-2">Notas</p>
                    <p className="text-muted-foreground whitespace-pre-line">{client.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Cases */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Casos</CardTitle>
                <Button size="sm" asChild>
                  <Link href={`/dashboard/cases/new?client=${client.id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Caso
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {client.cases && client.cases.length > 0 ? (
                  client.cases.map((case_: any) => (
                    <div key={case_.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{case_.title}</h4>
                          <Badge variant={getStatusColor(case_.status)}>{case_.status}</Badge>
                          <Badge className={getPriorityColor(case_.priority)} variant="outline">
                            {case_.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Inicio: {new Date(case_.start_date).toLocaleDateString("es-ES")}
                          {case_.end_date && ` • Fin: ${new Date(case_.end_date).toLocaleDateString("es-ES")}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/cases/${case_.id}`}>Ver Caso</Link>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay casos</h3>
                    <p className="text-muted-foreground mb-4">Este cliente no tiene casos asignados aún</p>
                    <Button asChild>
                      <Link href={`/dashboard/cases/new?client=${client.id}`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Primer Caso
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total de Casos</span>
                <span className="font-medium">{totalCases}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Casos Activos</span>
                <span className="font-medium">{activeCases.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Casos Cerrados</span>
                <span className="font-medium">
                  {client.cases?.filter((c: any) => c.status === "closed").length || 0}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cliente desde</span>
                <span className="font-medium">{new Date(client.created_at).toLocaleDateString("es-ES")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notas Recientes</CardTitle>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/clients/${client.id}/notes`}>
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Todas
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {client.notes && client.notes.length > 0 ? (
                  client.notes.slice(0, 3).map((note: any) => (
                    <div key={note.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="text-sm font-medium truncate">{note.title || "Sin título"}</h5>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.created_at).toLocaleDateString("es-ES")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">Por: {note.users?.full_name}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay notas registradas</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                <Link href={`/dashboard/cases/new?client=${client.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Nuevo Caso
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                <Link href={`/dashboard/clients/${client.id}/notes/new`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Agregar Nota
                </Link>
              </Button>
              {client.email && (
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                  <a href={`mailto:${client.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Email
                  </a>
                </Button>
              )}
              {client.phone && (
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                  <a href={`tel:${client.phone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Llamar
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
