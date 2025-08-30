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

interface Client {
  id: string
  name: string
  company?: string
}

interface CaseData {
  id: string
  title: string
  description: string
  client_id: string
  status: "active" | "pending" | "closed" | "archived"
  priority: "low" | "medium" | "high" | "urgent"
  start_date: string
  end_date: string | null
  estimated_hours: number | null
  hourly_rate: number | null
}

export default function EditCasePage({ params }: { params: { id: string } }) {
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [clientId, setClientId] = useState("")
  const [status, setStatus] = useState<"active" | "pending" | "closed" | "archived">("active")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [estimatedHours, setEstimatedHours] = useState("")
  const [hourlyRate, setHourlyRate] = useState("")
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch case data
        const { data: caseData, error: caseError } = await supabase
          .from("cases")
          .select("*")
          .eq("id", params.id)
          .single()

        if (caseError) {
          setError("Caso no encontrado")
          return
        }

        setCaseData(caseData)
        setTitle(caseData.title)
        setDescription(caseData.description || "")
        setClientId(caseData.client_id)
        setStatus(caseData.status)
        setPriority(caseData.priority)
        setStartDate(caseData.start_date)
        setEndDate(caseData.end_date || "")
        setEstimatedHours(caseData.estimated_hours?.toString() || "")
        setHourlyRate(caseData.hourly_rate?.toString() || "")

        // Fetch clients
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, name, company")
          .order("name")

        if (clientsError) {
          console.error("Error fetching clients:", clientsError)
        } else {
          setClients(clientsData || [])
        }
      } catch (err) {
        setError("Error cargando los datos")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const updateData = {
        title,
        description,
        client_id: clientId,
        status,
        priority,
        start_date: startDate,
        end_date: endDate || null,
        estimated_hours: estimatedHours ? Number.parseInt(estimatedHours) : null,
        hourly_rate: hourlyRate ? Number.parseFloat(hourlyRate) : null,
      }

      const { error } = await supabase.from("cases").update(updateData).eq("id", params.id)

      if (error) {
        setError(error.message)
      } else {
        router.push(`/dashboard/cases/${params.id}`)
      }
    } catch (err) {
      setError("Error inesperado. Intenta nuevamente.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Caso no encontrado</h2>
        <Button asChild>
          <Link href="/dashboard/cases">Volver a Casos</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/cases/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Caso</h1>
          <p className="text-muted-foreground">Modifica los detalles del caso</p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Información del Caso</CardTitle>
          <CardDescription>Actualiza los detalles del caso</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título del Caso *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={saving} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Select value={clientId} onValueChange={setClientId} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.company && `(${client.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={status}
                  onValueChange={(value: "active" | "pending" | "closed" | "archived") => setStatus(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="closed">Cerrado</SelectItem>
                    <SelectItem value="archived">Archivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha de Inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha de Fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Horas Estimadas</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Tarifa por Hora</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving || !title || !clientId}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/dashboard/cases/${params.id}`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
