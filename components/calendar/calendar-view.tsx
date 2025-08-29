"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User } from "lucide-react"
import Link from "next/link"

interface Event {
  id: string
  title: string
  description: string | null
  event_type: "meeting" | "hearing" | "deadline" | "appointment" | "reminder"
  start_time: string
  end_time: string
  location: string | null
  is_all_day: boolean
  matters: {
    id: string
    title: string
    clients: {
      first_name: string
      last_name: string
      company_name: string | null
      client_type: "individual" | "company"
    }
  } | null
  clients: {
    id: string
    first_name: string
    last_name: string
    company_name: string | null
    client_type: "individual" | "company"
  } | null
}

interface CalendarViewProps {
  events: Event[]
  canManage: boolean
}

export function CalendarView({ events, canManage }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("month")

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getClientName = (client: Event["clients"] | Event["matters"]["clients"]) => {
    if (!client) return ""
    if (client.client_type === "company") {
      return client.company_name || `${client.first_name} ${client.last_name}`
    }
    return `${client.first_name} ${client.last_name}`
  }

  const getEventTypeBadge = (eventType: Event["event_type"]) => {
    const variants = {
      meeting: "default",
      hearing: "destructive",
      deadline: "secondary",
      appointment: "outline",
      reminder: "secondary",
    } as const

    const labels = {
      meeting: "Reunión",
      hearing: "Audiencia",
      deadline: "Fecha Límite",
      appointment: "Cita",
      reminder: "Recordatorio",
    }

    return <Badge variant={variants[eventType]}>{labels[eventType]}</Badge>
  }

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (direction === "prev") {
      newDate.setMonth(currentDate.getMonth() - 1)
    } else {
      newDate.setMonth(currentDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Filter events for current month
  const currentMonthEvents = events.filter((event) => {
    const eventDate = new Date(event.start_time)
    return eventDate.getMonth() === currentDate.getMonth() && eventDate.getFullYear() === currentDate.getFullYear()
  })

  // Group events by date
  const eventsByDate = currentMonthEvents.reduce(
    (acc, event) => {
      const dateKey = new Date(event.start_time).toDateString()
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(event)
      return acc
    },
    {} as Record<string, Event[]>,
  )

  // Get upcoming events (next 7 days)
  const today = new Date()
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingEvents = events
    .filter((event) => {
      const eventDate = new Date(event.start_time)
      return eventDate >= today && eventDate <= nextWeek
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calendar Navigation */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {currentDate.toLocaleDateString("es-ES", {
                  month: "long",
                  year: "numeric",
                })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Hoy
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.keys(eventsByDate).length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay eventos programados este mes</p>
                  {canManage && (
                    <Button asChild className="mt-4">
                      <Link href="/dashboard/calendar/new">Crear Primer Evento</Link>
                    </Button>
                  )}
                </div>
              ) : (
                Object.entries(eventsByDate).map(([dateKey, dayEvents]) => (
                  <div key={dateKey} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">{formatDate(dayEvents[0].start_time)}</h3>
                    <div className="space-y-2">
                      {dayEvents.map((event) => (
                        <div key={event.id} className="flex items-start gap-3 p-2 rounded border">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getEventTypeBadge(event.event_type)}
                              <span className="font-medium">{event.title}</span>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {event.is_all_day
                                  ? "Todo el día"
                                  : `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`}
                              </div>

                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </div>
                              )}
                            </div>

                            {(event.matters || event.clients) && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <User className="h-3 w-3" />
                                {event.matters
                                  ? `${event.matters.title} - ${getClientName(event.matters.clients)}`
                                  : getClientName(event.clients)}
                              </div>
                            )}

                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events Sidebar */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay eventos próximos</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 10).map((event) => (
                  <div key={event.id} className="border rounded p-3">
                    <div className="flex items-center gap-2 mb-1">{getEventTypeBadge(event.event_type)}</div>
                    <h4 className="font-medium text-sm mb-1">{event.title}</h4>
                    <div className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(event.start_time)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.is_all_day ? "Todo el día" : formatTime(event.start_time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
