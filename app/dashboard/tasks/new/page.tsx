"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface CaseInfo {
  id: string
  title: string
  clients: { name: string }[]
}

interface User {
  id: string
  full_name: string
  role: string
}

export default function NewTaskPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [caseId, setCaseId] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [dueDate, setDueDate] = useState("")
  const [cases, setCases] = useState<CaseInfo[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      // Fetch cases
      const { data: casesData, error: casesError } = await supabase
        .from("cases")
        .select(`
          id,
          title,
          clients (name)
        `)
        .order("title")

      if (casesError) {
        console.error("Error fetching cases:", casesError)
      } else {
        setCases(casesData || [])
      }

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, role")
        .order("full_name")

      if (usersError) {
        console.error("Error fetching users:", usersError)
      } else {
        setUsers(usersData || [])
      }
    }

    fetchData()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setError("Usuario no autenticado")
        return
      }

      const taskData = {
        title,
        description,
        case_id: caseId === "none" || !caseId ? null : caseId,
        assigned_to: assignedTo === "none" || !assignedTo ? null : assignedTo,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        created_by: userData.user.id,
      }

      const { data, error } = await supabase.from("tasks").insert([taskData]).select().single()

      if (error) {
        setError(error.message)
      } else {
        router.push(`/dashboard/tasks/${data.id}`)
      }
    } catch (err) {
      setError("Error inesperado. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/tasks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Tarea</h1>
          <p className="text-muted-foreground">Crea una nueva tarea para tu estudio jurídico</p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Información de la Tarea</CardTitle>
          <CardDescription>Completa los detalles de la nueva tarea</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título de la Tarea *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Revisar contrato de servicios"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe los detalles de la tarea..."
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="case">Caso (Opcional)</Label>
              <Select value={caseId} onValueChange={setCaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un caso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin caso asignado</SelectItem>
                  {cases.map((case_) => (
                    <SelectItem key={case_.id} value={case_.id}>
                      {case_.title} - {case_.clients?.[0]?.name || 'Sin cliente'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Asignar a</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select
                  value={priority}
                  onValueChange={(value: "low" | "medium" | "high" | "urgent") => setPriority(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || !title}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear Tarea"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/tasks">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
