"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns"

interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  event_type: string
  all_day: boolean
  matters?: {
    title: string
    matter_number: string
  }
  clients?: {
    name: string
  }
}

interface CalendarViewProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDateClick: (date: Date) => void
  onNewEvent: () => void
}

const eventTypeColors = {
  meeting: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  court: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  deadline: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  consultation: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
}

export function CalendarView({ events, onEventClick, onDateClick, onNewEvent }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_time)
      return isSameDay(eventDate, date)
    })
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => (direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">{format(currentDate, "MMMM yyyy")}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={onNewEvent}>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dayEvents = getEventsForDate(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={day.toISOString()}
                className={`
                  min-h-[100px] p-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors
                  ${!isCurrentMonth ? "opacity-50" : ""}
                  ${isToday ? "bg-primary/10 border-primary" : "border-border"}
                `}
                onClick={() => onDateClick(day)}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="text-xs p-1 rounded cursor-pointer hover:opacity-80"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick(event)
                      }}
                    >
                      <Badge
                        variant="secondary"
                        className={`text-xs ${eventTypeColors[event.event_type as keyof typeof eventTypeColors]}`}
                      >
                        {event.title}
                      </Badge>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
