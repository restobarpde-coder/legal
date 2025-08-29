import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { CalendarView } from "@/components/calendar/calendar-view"

export default async function CalendarPage() {
  const supabase = await createClient()

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

  // Get upcoming events for the next 30 days
  const today = new Date()
  const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  const { data: events } = await supabase
    .from("events")
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
      clients (
        id,
        first_name,
        last_name,
        company_name,
        client_type
      )
    `)
    .eq("organization_id", profile.organization_id)
    .gte("start_time", today.toISOString())
    .lte("start_time", nextMonth.toISOString())
    .order("start_time", { ascending: true })

  const canManageEvents = ["admin", "lawyer", "assistant"].includes(profile.role)

  // Calculate statistics
  const todayEvents =
    events?.filter((e) => {
      const eventDate = new Date(e.start_time).toDateString()
      return eventDate === today.toDateString()
    }).length || 0

  const thisWeekEvents =
    events?.filter((e) => {
      const eventDate = new Date(e.start_time)
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      return eventDate >= weekStart && eventDate <= weekEnd
    }).length || 0

  const meetings = events?.filter((e) => e.event_type === "meeting").length || 0
  const hearings = events?.filter((e) => e.event_type === "hearing").length || 0

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Calendario</h1>
          <p className="text-muted-foreground">Gestiona citas, audiencias y eventos del estudio</p>
        </div>
        {canManageEvents && (
          <Button asChild>
            <Link href="/dashboard/calendar/new">Nuevo Evento</Link>
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayEvents}</div>
              <p className="text-xs text-muted-foreground">Eventos programados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{thisWeekEvents}</div>
              <p className="text-xs text-muted-foreground">Próximos eventos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reuniones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{meetings}</div>
              <p className="text-xs text-muted-foreground">Próximo mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Audiencias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hearings}</div>
              <p className="text-xs text-muted-foreground">Próximo mes</p>
            </CardContent>
          </Card>
        </div>

        <CalendarView events={events || []} canManage={canManageEvents} />
      </div>
    </div>
  )
}
