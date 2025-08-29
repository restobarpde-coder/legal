"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

interface CalendarEvent {
  id?: string
  title: string
  description: string
  start_time: string
  end_time: string
  all_day: boolean
  location: string
  matter_id: string
  client_id: string
  event_type: string
  attendees: string[]
}

interface Client {
  id: string
  name: string
}

interface Matter {
  id: string
  title: string
  matter_number: string
}

interface EventFormProps {
  event?: CalendarEvent
  selectedDate?: Date
  onSuccess?: () => void
  onCancel?: () => void
}

export function EventForm({ event, selectedDate, onSuccess, onCancel }: EventFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [matters, setMatters] = useState<Matter[]>([])
  const [formData, setFormData] = useState<CalendarEvent>({
    title: event?.title || "",
    description: event?.description || "",
    start_time: event?.start_time || (selectedDate ? selectedDate.toISOString().slice(0, 16) : ""),
    end_time:
      event?.end_time ||
      (selectedDate ? new Date(selectedDate.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16) : ""),
    all_day: event?.all_day || false,
    location: event?.location || "",
    matter_id: event?.matter_id || "",
    client_id: event?.client_id || "",
    event_type: event?.event_type || "meeting",
    attendees: event?.attendees || [],
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, mattersRes] = await Promise.all([fetch("/api/clients"), fetch("/api/matters")])

        if (clientsRes.ok) {
          const clientsData = await clientsRes.json()
          setClients(clientsData)
        }

        if (mattersRes.ok) {
          const mattersData = await mattersRes.json()
          setMatters(mattersData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = event ? `/api/calendar-events/${event.id}` : "/api/calendar-events"
      const method = event ? "PUT" : "POST"

      const payload = {
        ...formData,
        matter_id: formData.matter_id || null,
        client_id: formData.client_id || null,
        attendees: formData.attendees.filter((email) => email.trim() !== ""),
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save event")
      }

      toast({
        title: "Success",
        description: `Event ${event ? "updated" : "created"} successfully`,
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: keyof CalendarEvent, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAttendeesChange = (value: string) => {
    const emails = value.split(",").map((email) => email.trim())
    handleChange("attendees", emails)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{event ? "Edit Event" : "New Event"}</CardTitle>
        <CardDescription>{event ? "Update event details" : "Schedule a new calendar event"}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={formData.title} onChange={(e) => handleChange("title", e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type</Label>
              <Select value={formData.event_type} onValueChange={(value) => handleChange("event_type", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="court">Court Hearing</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange("location", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="all_day"
              checked={formData.all_day}
              onCheckedChange={(checked) => handleChange("all_day", checked)}
            />
            <Label htmlFor="all_day">All day event</Label>
          </div>

          {!formData.all_day && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => handleChange("start_time", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => handleChange("end_time", e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client</Label>
              <Select value={formData.client_id} onValueChange={(value) => handleChange("client_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="matter_id">Matter</Label>
              <Select value={formData.matter_id} onValueChange={(value) => handleChange("matter_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a matter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No matter</SelectItem>
                  {matters.map((matter) => (
                    <SelectItem key={matter.id} value={matter.id}>
                      {matter.matter_number} - {matter.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendees">Attendees (comma-separated emails)</Label>
            <Input
              id="attendees"
              value={formData.attendees.join(", ")}
              onChange={(e) => handleAttendeesChange(e.target.value)}
              placeholder="john@example.com, jane@example.com"
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : event ? "Update Event" : "Create Event"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
