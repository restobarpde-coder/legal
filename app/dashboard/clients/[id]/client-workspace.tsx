'use client'

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConversationList } from "@/components/inbox/conversation-list"
import { ClientMessageActions } from "@/components/clients/client-message-actions"
import {
  Building,
  CheckSquare,
  Edit,
  FileText,
  FolderOpen,
  Mail,
  MapPin,
  MessageSquare,
  Mic,
  Phone,
  Plus,
  Scale,
  Users,
} from "lucide-react"

export type ClientCaseSummary = {
  id: string
  title: string
  case_number: string | null
  status: string
  priority: string
  start_date: string | null
  end_date: string | null
  created_at: string
  taskCount: number
  openTaskCount: number
  documentCount: number
  noteCount: number
  declarationCount: number
}

export type ActivityItem = {
  id: string
  kind: "task" | "document" | "note" | "declaration"
  title: string
  case_id: string | null
  date: string
}

export type ClientTeamMember = {
  user_id: string
  name: string
  email: string | null
  role: string
  case_ids: string[]
}

export type ClientRecord = {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  address: string | null
  rut: string | null
  ci: string | null
  departamento: string | null
  pais: string | null
  conyuge: string | null
  notes: string | null
  created_at: string
}

type Props = {
  client: ClientRecord
  cases: ClientCaseSummary[]
  team: ClientTeamMember[]
  recentActivity: ActivityItem[]
}

const TAB_VALUES = ["resumen", "casos", "equipo", "chat"] as const

type TabValue = (typeof TAB_VALUES)[number]

const CASE_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  pending: "secondary",
  closed: "outline",
  archived: "destructive",
}

const PRIORITY_CLASS: Record<string, string> = {
  urgent: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
  high: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950",
  medium: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  low: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950",
}

const ACTIVITY_META: Record<ActivityItem["kind"], { icon: typeof FileText; label: string }> = {
  task: { icon: CheckSquare, label: "Tarea" },
  document: { icon: FolderOpen, label: "Documento" },
  note: { icon: FileText, label: "Nota" },
  declaration: { icon: Mic, label: "Declaración" },
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("es-ES")
}

export function ClientWorkspace({ client, cases, team, recentActivity }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const requestedTab = searchParams.get("tab") as TabValue | null
  const activeTab: TabValue =
    requestedTab && TAB_VALUES.includes(requestedTab) ? requestedTab : "resumen"

  // La pestaña vive en la URL para que se pueda compartir y sobreviva al refresh.
  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "resumen") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }
    const query = params.toString()
    router.replace(`/dashboard/clients/${client.id}${query ? `?${query}` : ""}`, { scroll: false })
  }

  const caseTitleById = new Map(cases.map(c => [c.id, c.title]))
  const activeCases = cases.filter(c => c.status === "active")
  const totals = cases.reduce(
    (acc, c) => ({
      openTasks: acc.openTasks + c.openTaskCount,
      documents: acc.documents + c.documentCount,
    }),
    { openTasks: 0, documents: 0 }
  )

  const caseLabel = (caseId: string | null) =>
    caseId ? caseTitleById.get(caseId) ?? "Caso" : "Sin caso"

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="grid w-full grid-cols-4 h-auto">
        <TabsTrigger value="resumen" className="text-xs sm:text-sm">Resumen</TabsTrigger>
        <TabsTrigger value="casos" className="text-xs sm:text-sm">Casos ({cases.length})</TabsTrigger>
        <TabsTrigger value="equipo" className="text-xs sm:text-sm">Equipo ({team.length})</TabsTrigger>
        <TabsTrigger value="chat" className="text-xs sm:text-sm">Chat</TabsTrigger>
      </TabsList>

      {/* ---------------------------------------------------------------- Resumen */}
      <TabsContent value="resumen" className="space-y-6">
        {/* Los totales son un rollup de los casos del cliente: se leen acá, se
            trabajan dentro de cada caso. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Casos activos", value: activeCases.length, total: cases.length, icon: Scale },
            { label: "Tareas abiertas", value: totals.openTasks, icon: CheckSquare },
            { label: "Documentos", value: totals.documents, icon: FolderOpen },
            { label: "Equipo asignado", value: team.length, icon: Users },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">
                      {stat.value}
                      {stat.total !== undefined && stat.total !== stat.value && (
                        <span className="text-base font-normal text-muted-foreground"> / {stat.total}</span>
                      )}
                    </p>
                  </div>
                  <stat.icon className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {client.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium">Email</p>
                      <a href={`mailto:${client.email}`} className="text-primary hover:underline break-all">
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
                  <div className="flex items-start gap-3 sm:col-span-2">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Dirección</p>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {client.address}
                        {client.departamento ? `, ${client.departamento}` : ""}
                        {client.pais ? `, ${client.pais}` : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {(client.rut || client.ci || client.conyuge) && (
                <>
                  <Separator />
                  <div className="grid gap-3 sm:grid-cols-3 text-sm">
                    {client.rut && (
                      <div>
                        <p className="font-medium">RUT</p>
                        <p className="text-muted-foreground">{client.rut}</p>
                      </div>
                    )}
                    {client.ci && (
                      <div>
                        <p className="font-medium">CI</p>
                        <p className="text-muted-foreground">{client.ci}</p>
                      </div>
                    )}
                    {client.conyuge && (
                      <div>
                        <p className="font-medium">Cónyuge</p>
                        <p className="text-muted-foreground">{client.conyuge}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {client.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="font-medium mb-2">Observaciones</p>
                    <p className="text-muted-foreground whitespace-pre-line">{client.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Siguiente paso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button size="sm" className="w-full justify-start" asChild>
                  <Link href={`/dashboard/cases/new?client=${client.id}`}>
                    <Scale className="h-4 w-4 mr-2" />
                    Nuevo caso
                  </Link>
                </Button>
                <ClientMessageActions
                  clientId={client.id}
                  clientName={client.name}
                  clientEmail={client.email}
                  clientPhone={client.phone}
                />
                <p className="pt-1 text-xs text-muted-foreground">
                  Tareas, documentos, notas y declaraciones se crean dentro de un caso.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actividad reciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin actividad todavía.</p>
                ) : (
                  recentActivity.map(item => {
                    const meta = ACTIVITY_META[item.kind]
                    const content = (
                      <>
                        <meta.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{item.title}</span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {meta.label} · {caseLabel(item.case_id)} · {formatDate(item.date)}
                          </span>
                        </span>
                      </>
                    )

                    return item.case_id ? (
                      <Link
                        key={`${item.kind}-${item.id}`}
                        href={`/dashboard/cases/${item.case_id}`}
                        className="flex items-start gap-2 rounded-md p-1 -m-1 transition-colors hover:bg-muted/50"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div key={`${item.kind}-${item.id}`} className="flex items-start gap-2">
                        {content}
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      {/* ------------------------------------------------------------------ Casos */}
      <TabsContent value="casos">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Casos del cliente</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cada caso guarda sus tareas, documentos, notas y declaraciones.
                </p>
              </div>
              <Button size="sm" asChild>
                <Link href={`/dashboard/cases/new?client=${client.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo caso
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {cases.length === 0 ? (
              <div className="text-center py-10">
                <Scale className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No hay casos</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Todo el trabajo cuelga de un caso. Creá el primero para empezar.
                </p>
                <Button asChild size="sm">
                  <Link href={`/dashboard/cases/new?client=${client.id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primer caso
                  </Link>
                </Button>
              </div>
            ) : (
              cases.map(case_ => (
                <div key={case_.id} className="rounded-lg border p-4">
                  <Link href={`/dashboard/cases/${case_.id}`} className="group block">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-medium truncate group-hover:underline">{case_.title}</h4>
                      <Badge variant={CASE_STATUS_VARIANT[case_.status] ?? "outline"}>{case_.status}</Badge>
                      <Badge className={PRIORITY_CLASS[case_.priority]} variant="outline">
                        {case_.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {case_.case_number ? `${case_.case_number} · ` : ""}
                      Inicio: {formatDate(case_.start_date)}
                      {case_.end_date ? ` · Fin: ${formatDate(case_.end_date)}` : ""}
                    </p>
                  </Link>

                  {/* Atajos al contenido del caso: el trabajo vive ahí adentro. */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { label: "Tareas", count: case_.taskCount, extra: case_.openTaskCount, tab: "tasks", icon: CheckSquare },
                      { label: "Documentos", count: case_.documentCount, tab: "documents", icon: FolderOpen },
                      { label: "Notas", count: case_.noteCount, tab: "notes", icon: FileText },
                      { label: "Declaraciones", count: case_.declarationCount, tab: "declarations", icon: Mic },
                    ].map(shortcut => (
                      <Button key={shortcut.tab} variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/cases/${case_.id}?tab=${shortcut.tab}`}>
                          <shortcut.icon className="h-3.5 w-3.5 mr-1.5" />
                          {shortcut.label}
                          <span className="ml-1.5 text-muted-foreground">
                            {shortcut.count}
                            {shortcut.extra !== undefined && shortcut.extra > 0 && ` · ${shortcut.extra} abiertas`}
                          </span>
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ----------------------------------------------------------------- Equipo */}
      <TabsContent value="equipo">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Equipo asignado</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Quiénes trabajan en los casos de este cliente. Se administra desde cada caso.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {team.length === 0 ? (
              <div className="text-center py-10">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Sin equipo asignado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  El equipo se administra desde cada caso del cliente.
                </p>
                <Button asChild size="sm">
                  <Link
                    href={
                      cases[0]
                        ? `/dashboard/cases/${cases[0].id}`
                        : `/dashboard/cases/new?client=${client.id}`
                    }
                  >
                    {cases[0] ? "Ir al caso" : "Crear primer caso"}
                  </Link>
                </Button>
              </div>
            ) : (
              team.map(member => (
                <div key={member.user_id} className="flex items-center gap-3 rounded-lg border p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{member.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{member.email ?? "—"}</p>
                    <p className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                      {member.case_ids.map(caseId => (
                        <Link
                          key={caseId}
                          href={`/dashboard/cases/${caseId}`}
                          className="hover:underline"
                        >
                          {caseLabel(caseId)}
                        </Link>
                      ))}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">{member.role}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ------------------------------------------------------------------- Chat */}
      <TabsContent value="chat">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversaciones
              </CardTitle>
              <ClientMessageActions
                clientId={client.id}
                clientName={client.name}
                clientEmail={client.email}
                clientPhone={client.phone}
              />
            </div>
          </CardHeader>
          <CardContent>
            <ConversationList
              clientId={client.id}
              emptyMessage="Este cliente no tiene conversaciones vinculadas."
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

/** Encabezado de la ficha: identidad del cliente + acceso a edición. */
export function ClientHeader({ client }: { client: ClientRecord }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          {client.company && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Building className="h-5 w-5" />
              <span className="text-lg">{client.company}</span>
            </span>
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
  )
}
