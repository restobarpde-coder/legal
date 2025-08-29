"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CalendarView } from "@/components/calendar/calendar-view"
import { EventForm } from "@/components/calendar/event-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"

interface CalendarEvent {
  id: string
  title: string
  description: string
  start_time: string
  end_time: string
  event_type: string
  all_day: boolean
  location: string
  matters?: {
    title: string
    matter_number: string
  }
  clients?: {
    name: string
  }
}

export default function CalendarPage() {
  const router = useRouter()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>()

  useEffect(() => {
    const initializeAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      // Get user profile
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      setProfile(profile)
    }

    initializeAuth()
  }, [router])

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/calendar-events")
      if (!response.ok) throw new Error("Failed to fetch events")

      const data = await response.json()
      setEvents(data)
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchEvents()
    }
  }, [user])

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventForm(true)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedEvent(undefined)
    setShowEventForm(true)
  }

  const handleNewEvent = () => {
    setSelectedDate(new Date())
    setSelectedEvent(undefined)
    setShowEventForm(true)
  }

  const handleFormSuccess = () => {
    setShowEventForm(false)
    setSelectedEvent(undefined)
    setSelectedDate(undefined)
    fetchEvents()
  }

  const handleFormCancel = () => {
    setShowEventForm(false)
    setSelectedEvent(undefined)
    setSelectedDate(undefined)
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <DashboardLayout user={user} profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">Calendar</h1>
          <p className="text-muted-foreground">Manage your appointments and deadlines</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading calendar...</p>
          </div>
        ) : (
          <CalendarView
            events={events}
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
            onNewEvent={handleNewEvent}
          />
        )}

        <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedEvent ? "Edit Event" : "New Event"}</DialogTitle>
            </DialogHeader>
            <EventForm
              event={selectedEvent}
              selectedDate={selectedDate}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
