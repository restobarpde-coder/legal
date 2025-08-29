"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"

interface Matter {
  id: string
  title: string
  matter_number: string
  status: string
  priority: string
  practice_area: string
  clients: {
    name: string
  }
  profiles: {
    first_name: string
    last_name: string
  } | null
  created_at: string
}

const statusColors = {
  open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  archived: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

const priorityColors = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

export default function MattersPage() {
  const router = useRouter()
  const [matters, setMatters] = useState<Matter[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  const fetchMatters = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/matters?${params}`)
      if (!response.ok) throw new Error("Failed to fetch matters")

      const data = await response.json()

      // Filter by search term on client side for simplicity
      const filteredData = searchTerm
        ? data.filter(
            (matter: Matter) =>
              matter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              matter.matter_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
              matter.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()),
          )
        : data

      setMatters(filteredData)
    } catch (error) {
      console.error("Error fetching matters:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchMatters()
    }
  }, [searchTerm, statusFilter, user])

  const handleDelete = async (matterId: string) => {
    if (!confirm("Are you sure you want to delete this matter?")) {
      return
    }

    setDeletingId(matterId)
    try {
      const response = await fetch(`/api/matters/${matterId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete matter")
      }

      toast({
        title: "Success",
        description: "Matter deleted successfully",
      })

      fetchMatters()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete matter",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <DashboardLayout user={user} profile={profile}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-balance">Matters</h1>
            <p className="text-muted-foreground">Manage your legal matters and cases</p>
          </div>
          <Button onClick={() => router.push("/dashboard/matters/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Matter
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Legal Matters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search matters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading matters...</p>
              </div>
            ) : matters.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No matters found</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matter #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assigned Lawyer</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matters.map((matter) => (
                      <TableRow key={matter.id}>
                        <TableCell className="font-mono text-sm">{matter.matter_number}</TableCell>
                        <TableCell className="font-medium">{matter.title}</TableCell>
                        <TableCell>{matter.clients?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[matter.status as keyof typeof statusColors]}>
                            {matter.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={priorityColors[matter.priority as keyof typeof priorityColors]}>
                            {matter.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {matter.profiles
                            ? `${matter.profiles.first_name} ${matter.profiles.last_name}`
                            : "Unassigned"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/matters/${matter.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/matters/${matter.id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(matter.id)}
                                disabled={deletingId === matter.id}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deletingId === matter.id ? "Deleting..." : "Delete"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
