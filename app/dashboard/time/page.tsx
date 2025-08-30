import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { Plus, Search, Clock, DollarSign, Calendar } from "lucide-react"
import Link from "next/link"

async function getTimeEntries() {
  const supabase = await createClient()
  const user = await requireAuth()

  const { data: timeEntries, error } = await supabase
    .from("time_entries")
    .select(`
      *,
      cases (
        id,
        title,
        clients (name),
        hourly_rate
      ),
      users (
        full_name
      )
    `)
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  if (error) {
    console.error("Error fetching time entries:", error)
    return []
  }

  return timeEntries || []
}

export default async function TimePage() {
  const timeEntries = await getTimeEntries()
  const totalHours = timeEntries.reduce((sum, entry) => sum + Number.parseFloat(entry.hours.toString()), 0)
  const totalBillable = timeEntries
    .filter((entry) => entry.billable)
    .reduce((sum, entry) => sum + Number.parseFloat(entry.hours.toString()) * (entry.rate || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registro de Tiempo</h1>
          <p className="text-muted-foreground">Gestiona el tiempo dedicado a cada caso</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/time/new">
            <Plus className="h-4 w-4 mr-2" />
            Registrar Tiempo
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Tiempo total registrado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Facturables</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeEntries
                .filter((e) => e.billable)
                .reduce((sum, e) => sum + Number.parseFloat(e.hours.toString()), 0)
                .toFixed(1)}
              h
            </div>
            <p className="text-xs text-muted-foreground">Tiempo facturable</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBillable.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monto total facturado</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por descripción..." className="pl-9" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Caso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los casos</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Facturación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="billable">Facturable</SelectItem>
                <SelectItem value="non-billable">No Facturable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Time entries list */}
      <div className="grid gap-4">
        {timeEntries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay registros de tiempo</h3>
                <p className="text-muted-foreground mb-4">Comienza registrando tu primer entrada de tiempo</p>
                <Button asChild>
                  <Link href="/dashboard/time/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Primer Tiempo
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          timeEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold truncate">{entry.description}</h3>
                      <Badge variant={entry.billable ? "default" : "secondary"}>
                        {entry.billable ? "Facturable" : "No Facturable"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {entry.cases && (
                        <span>
                          <strong>Caso:</strong> {entry.cases.title} - {entry.cases.clients?.name}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{entry.hours}h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(entry.date).toLocaleDateString("es-ES")}</span>
                      </div>
                      {entry.rate && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>${(Number.parseFloat(entry.hours.toString()) * entry.rate).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
