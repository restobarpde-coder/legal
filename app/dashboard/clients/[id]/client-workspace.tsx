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
import { Building, Edit, Mail, MapPin, MessageSquare, Phone, Plus, Scale } from "lucide-react"

/**
 * El cliente solo conoce sus CASOS. Todo lo que se produce trabajando
 * (documentos, declaraciones, notas, fotos, tareas) vive dentro del caso.
 * Acá únicamente se resume cuánto trabajo abierto tiene cada uno.
 */
export type ClientCaseSummary = {
  id: string
  title: string
  case_number: string | null
  status: string
  priority: string
  start_date: string | null
  end_date: string | null
  created_at: string
  openTaskCount: number
  lastActivityAt: string | null
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
}

const TAB_VALUES = ["datos", "casos", "chat"] as const

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

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("es-ES")
}

export function ClientWorkspace({ client, cases }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const requestedTab = searchParams.get("tab") as TabValue | null
  const activeTab: TabValue =
    requestedTab && TAB_VALUES.includes(requestedTab) ? requestedTab : "datos"

  // La pestaña vive en la URL para que se pueda compartir y sobreviva al refresh.
  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "datos") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }
    const query = params.toString()
    router.replace(`/dashboard/clients/${client.id}${query ? `?${query}` : ""}`, { scroll: false })
  }

  const hasIdentification = client.rut || client.ci || client.conyuge

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-3 h-auto">
        <TabsTrigger value="datos" className="text-xs sm:text-sm">Datos</TabsTrigger>
        <TabsTrigger value="casos" className="text-xs sm:text-sm">Casos ({cases.length})</TabsTrigger>
        <TabsTrigger value="chat" className="text-xs sm:text-sm">Chat</TabsTrigger>
      </TabsList>

      {/* ------------------------------------------------------------------ Datos */}
      <TabsContent value="datos">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Datos de contacto</CardTitle>
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

              {hasIdentification && (
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

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
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
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" asChild>
                <Link href={`/dashboard/clients/${client.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar datos
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ------------------------------------------------------------------ Casos */}
      <TabsContent value="casos">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Casos</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Entrá a un caso para ver sus documentos, declaraciones, notas, fotos y tareas.
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      {case_.openTaskCount > 0
                        ? `${case_.openTaskCount} ${case_.openTaskCount === 1 ? "tarea abierta" : "tareas abiertas"}`
                        : "Sin tareas abiertas"}
                      {case_.lastActivityAt ? ` · Último movimiento ${formatDate(case_.lastActivityAt)}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground">Abrir caso →</span>
                </Link>
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
