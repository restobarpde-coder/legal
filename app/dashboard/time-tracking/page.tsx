"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface TimeEntry {
  id: string
  description: string
  hours: number
  hourly_rate: number
  total_amount: number
  date: string
  is_billable: boolean
  matters?: {
    title: string
    matter_number: string
  }
  tasks?: {
    title: string
  }
}

interface Matter {
  id: string
  title: string
  matter_number: string
  hourly_rate: number
}

export default function TimeTrackingPage() {
  const router = useRouter()
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [matters, setMatters] = useState<Matter[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    matter_id: "",
    description: "",
    hours: "",
    hourly_rate: "",
    date: new Date().toISOString().split("T")[0],
    is_billable: true,
  })

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

  const fetchData = async () => {
    try {
      const [timeEntriesRes, mattersRes] = await Promise.all([fetch("/api/time-entries"), fetch("/api/matters")])

      if (timeEntriesRes.ok) {
        const timeEntriesData = await timeEntriesRes.json()
        setTimeEntries(timeEntriesData)
      }

      if (mattersRes.ok) {
        const mattersData = await mattersRes.json()
        setMatters(mattersData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const handleMatterChange = (matterId: string) => {
    const matter = matters.find((m) => m.id === matterId)
    setFormData((prev) => ({
      ...prev,
      matter_id: matterId,
      hourly_rate: matter?.hourly_rate?.toString() || "",
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          hours: Number.parseFloat(formData.hours),
          hourly_rate: Number.parseFloat(formData.hourly_rate),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create time entry")
      }

      toast({
        title: "Success",
        description: "Time entry created successfully",
      })

      setFormData({
        matter_id: "",
        description: "",
        hours: "",
        hourly_rate: "",
        date: new Date().toISOString().split("T")[0],
        is_billable: true,
      })
      setShowForm(false)
      fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0)
  const totalAmount = timeEntries.reduce((sum, entry) => sum + entry.total_amount, 0)

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <DashboardLayout user={user} profile={profile}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-balance">Time Tracking</h1>
            <p className="text-muted-foreground">Log and manage your billable hours</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Time
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHours.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">All time entries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Billable amount</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rate</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalHours > 0 ? (totalAmount / totalHours).toFixed(2) : "0.00"}
              </div>
              <p className="text-xs text-muted-foreground">Per hour</p>
            </CardContent>
          </Card>
        </div>

        {/* Time Entry Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Log Time Entry</CardTitle>
              <CardDescription>Record your billable hours</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="matter_id">Matter *</Label>
                    <Select value={formData.matter_id} onValueChange={handleMatterChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a matter" />
                      </SelectTrigger>
                      <SelectContent>
                        {matters.map((matter) => (
                          <SelectItem key={matter.id} value={matter.id}>
                            {matter.matter_number} - {matter.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the work performed..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hours">Hours *</Label>
                    <Input
                      id="hours"
                      type="number"
                      step="0.25"
                      value={formData.hours}
                      onChange={(e) => setFormData((prev) => ({ ...prev, hours: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Hourly Rate ($) *</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, hourly_rate: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_billable"
                    checked={formData.is_billable}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_billable: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="is_billable">Billable</Label>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Log Time"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Time Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading time entries...</p>
              </div>
            ) : timeEntries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No time entries found</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Matter</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Billable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {entry.matters ? (
                            <div className="text-sm">
                              <div className="font-medium">{entry.matters.matter_number}</div>
                              <div className="text-muted-foreground">{entry.matters.title}</div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                        <TableCell>{entry.hours}h</TableCell>
                        <TableCell>${entry.hourly_rate.toFixed(2)}</TableCell>
                        <TableCell>${entry.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={entry.is_billable ? "default" : "secondary"}>
                            {entry.is_billable ? "Billable" : "Non-billable"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
