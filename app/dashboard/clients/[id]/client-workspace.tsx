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

export type ClientCase = {
  id: string
  title: string
  case_number: string | null
  status: string
  priority: string
  start_date: string | null
  end_date: string | null
  created_at: string
}

export type ClientTask = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  case_id: string | null
  assignee_name: string | null
}

export type ClientDocument = {
  id: string
  name: string
  document_type: string | null
  mime_type: string | null
  created_at: string
  case_id: string | null
}

export type ClientNote = {
  id: string
  title: string | null
  content: string
  created_at: string
  case_id: string | null
  author_name: string | null
}

export type ClientDeclaration = ClientNote

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
  cases: ClientCase[]
  tasks: ClientTask[]
  documents: ClientDocument[]
  notes: ClientNote[]
  declarations: ClientDeclaration[]
  team: ClientTeamMember[]
}

const TAB_VALUES = [
  "resumen",
  "casos",
  "tareas",
  "documentos",
  "notas",
  "declaraciones",
  "equipo",
  "chat",
] as const

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

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
  cancelled: "Cancelada",
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("es-ES")
}

/** Mensaje uniforme para cada pestaña vacía, siempre con el siguiente paso a mano. */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Scale
  title: string
  description: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="text-center py-10">
      <Icon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {action && (
        <Button asChild size="sm">
          <Link href={action.href}>
            <Plus className="h-4 w-4 mr-2" />
            {action.label}
          </Link>
        </Button>
      )}
    </div>
  )
}

export function ClientWorkspace({
  client,
  cases,
  tasks,
  documents,
  notes,
  declarations,
  team,
}: Props) {
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
  const openTasks = tasks.filter(c => c.status !== "completed" && c.status !== "cancelled")
  const firstCaseId = cases[0]?.id

  const caseLabel = (caseId: string | null) =>
    caseId ? caseTitleById.get(caseId) ?? "Caso" : "Sin caso"

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto">
        <TabsTrigger value="resumen" className="text-xs sm:text-sm">Resumen</TabsTrigger>
        <TabsTrigger value="casos" className="text-xs sm:text-sm">Casos ({cases.length})</TabsTrigger>
        <TabsTrigger value="tareas" className="text-xs sm:text-sm">Tareas ({tasks.length})</TabsTrigger>
        <TabsTrigger value="documentos" className="text-xs sm:text-sm">Docs ({documents.length})</TabsTrigger>
        <TabsTrigger value="notas" className="text-xs sm:text-sm">Notas ({notes.length})</TabsTrigger>
        <TabsTrigger value="declaraciones" className="text-xs sm:text-sm">Declaraciones ({declarations.length})</TabsTrigger>
        <TabsTrigger value="equipo" className="text-xs sm:text-sm">Equipo ({team.length})</TabsTrigger>
        <TabsTrigger value="chat" className="text-xs sm:text-sm">Chat</TabsTrigger>
      </TabsList>

      {/* ---------------------------------------------------------------- Resumen */}
      <TabsContent value="resumen" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Casos activos", value: activeCases.length, total: cases.length, icon: Scale, tab: "casos" },
            { label: "Tareas abiertas", value: openTasks.length, total: tasks.length, icon: CheckSquare, tab: "tareas" },
            { label: "Documentos", value: documents.length, icon: FolderOpen, tab: "documentos" },
            { label: "Equipo asignado", value: team.length, icon: Users, tab: "equipo" },
          ].map(stat => (
            <button
              key={stat.label}
              type="button"
              onClick={() => handleTabChange(stat.tab)}
              className="text-left"
            >
              <Card className="h-full transition-colors hover:bg-muted/50">
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
            </button>
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
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                  <Link href={firstCaseId ? `/dashboard/tasks/new?case=${firstCaseId}` : "/dashboard/tasks/new"}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Nueva tarea
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                  <Link href={firstCaseId ? `/dashboard/documents/upload?case=${firstCaseId}` : "/dashboard/documents/upload"}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Subir documento
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                  <Link href={`/dashboard/declarations?client=${client.id}`}>
                    <Mic className="h-4 w-4 mr-2" />
                    Grabar declaración
                  </Link>
                </Button>
                <ClientMessageActions
                  clientId={client.id}
                  clientName={client.name}
                  clientEmail={client.email}
                  clientPhone={client.phone}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actividad reciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {notes.length === 0 && tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin actividad todavía.</p>
                ) : (
                  <>
                    {notes.slice(0, 3).map(note => (
                      <div key={note.id} className="text-sm">
                        <p className="font-medium truncate">{note.title || "Nota sin título"}</p>
                        <p className="text-xs text-muted-foreground">
                          {caseLabel(note.case_id)} · {formatDate(note.created_at)}
                        </p>
                      </div>
                    ))}
                    {openTasks.slice(0, 3).map(task => (
                      <div key={task.id} className="text-sm">
                        <p className="font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Vence {formatDate(task.due_date)} · {caseLabel(task.case_id)}
                        </p>
                      </div>
                    ))}
                  </>
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
              <CardTitle>Casos del cliente</CardTitle>
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
              <EmptyState
                icon={Scale}
                title="No hay casos"
                description="Todo el trabajo cuelga de un caso. Creá el primero para empezar."
                action={{ label: "Crear primer caso", href: `/dashboard/cases/new?client=${client.id}` }}
              />
            ) : (
              cases.map(case_ => (
                <Link
                  key={case_.id}
                  href={`/dashboard/cases/${case_.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{case_.title}</h4>
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
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">Ver caso →</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ----------------------------------------------------------------- Tareas */}
      <TabsContent value="tareas">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tareas de todos sus casos</CardTitle>
              <Button size="sm" asChild disabled={!firstCaseId}>
                <Link href={firstCaseId ? `/dashboard/tasks/new?case=${firstCaseId}` : "/dashboard/tasks/new"}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva tarea
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="Sin tareas"
                description="Las tareas se crean sobre un caso del cliente."
                action={
                  firstCaseId
                    ? { label: "Crear tarea", href: `/dashboard/tasks/new?case=${firstCaseId}` }
                    : { label: "Crear primer caso", href: `/dashboard/cases/new?client=${client.id}` }
                }
              />
            ) : (
              tasks.map(task => (
                <Link
                  key={task.id}
                  href={`/dashboard/tasks/${task.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{task.title}</h4>
                      <Badge variant="outline">{TASK_STATUS_LABELS[task.status] ?? task.status}</Badge>
                      <Badge className={PRIORITY_CLASS[task.priority]} variant="outline">
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {caseLabel(task.case_id)} · Vence {formatDate(task.due_date)}
                      {task.assignee_name ? ` · ${task.assignee_name}` : ""}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ------------------------------------------------------------- Documentos */}
      <TabsContent value="documentos">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documentos y archivos</CardTitle>
              <Button size="sm" asChild>
                <Link href={firstCaseId ? `/dashboard/documents/upload?case=${firstCaseId}` : "/dashboard/documents/upload"}>
                  <Plus className="h-4 w-4 mr-2" />
                  Subir
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="Sin documentos"
                description="Los archivos se guardan dentro del caso al que pertenecen."
                action={
                  firstCaseId
                    ? { label: "Subir documento", href: `/dashboard/documents/upload?case=${firstCaseId}` }
                    : { label: "Crear primer caso", href: `/dashboard/cases/new?client=${client.id}` }
                }
              />
            ) : (
              documents.map(document => (
                <div key={document.id} className="flex items-center gap-3 rounded-lg border p-4">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{document.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {caseLabel(document.case_id)} · {formatDate(document.created_at)}
                      {document.document_type ? ` · ${document.document_type}` : ""}
                    </p>
                  </div>
                  {document.case_id && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/cases/${document.case_id}`}>Ver caso</Link>
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ------------------------------------------------------------------ Notas */}
      <TabsContent value="notas">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Notas</CardTitle>
              {firstCaseId && (
                <Button size="sm" asChild>
                  <Link href={`/dashboard/cases/${firstCaseId}/notes/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva nota
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {notes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Sin notas"
                description="Anotá acuerdos, llamadas y decisiones del cliente o de sus casos."
                action={
                  firstCaseId
                    ? { label: "Escribir nota", href: `/dashboard/cases/${firstCaseId}/notes/new` }
                    : undefined
                }
              />
            ) : (
              notes.map(note => (
                <div key={note.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-medium truncate">{note.title || "Nota sin título"}</h4>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(note.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {caseLabel(note.case_id)}
                    {note.author_name ? ` · ${note.author_name}` : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ---------------------------------------------------------- Declaraciones */}
      <TabsContent value="declaraciones">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Declaraciones grabadas</CardTitle>
              <Button size="sm" asChild>
                <Link href={`/dashboard/declarations?client=${client.id}`}>
                  <Mic className="h-4 w-4 mr-2" />
                  Grabar
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {declarations.length === 0 ? (
              <EmptyState
                icon={Mic}
                title="Sin declaraciones"
                description="Grabá una declaración y quedará adjunta al caso como nota y audio."
                action={{ label: "Grabar declaración", href: `/dashboard/declarations?client=${client.id}` }}
              />
            ) : (
              declarations.map(declaration => (
                <div key={declaration.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mic className="h-4 w-4 text-muted-foreground shrink-0" />
                      <h4 className="font-medium truncate">{caseLabel(declaration.case_id)}</h4>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(declaration.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">
                    {declaration.content}
                  </p>
                  {declaration.case_id && (
                    <Button variant="ghost" size="sm" className="mt-2 px-0" asChild>
                      <Link href={`/dashboard/cases/${declaration.case_id}`}>Ver en el caso →</Link>
                    </Button>
                  )}
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
            <CardTitle>Equipo asignado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {team.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Sin equipo asignado"
                description="El equipo se administra desde cada caso del cliente."
                action={
                  firstCaseId
                    ? { label: "Ir al caso", href: `/dashboard/cases/${firstCaseId}` }
                    : { label: "Crear primer caso", href: `/dashboard/cases/new?client=${client.id}` }
                }
              />
            ) : (
              team.map(member => (
                <div key={member.user_id} className="flex items-center gap-3 rounded-lg border p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{member.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{member.email ?? "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline">{member.role}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {member.case_ids.length} {member.case_ids.length === 1 ? "caso" : "casos"}
                    </p>
                  </div>
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
