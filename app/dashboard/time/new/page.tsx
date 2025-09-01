"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save, Clock } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Case {
  id: string
  title: string
  hourly_rate?: number
  clients?: { name: string }
}

export default function NewTimeEntryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cases, setCases] = useState<Case[]>([])
  const [formData, setFormData] = useState({
    case_id: "",
    description: "",
    hours: "",
    rate: "",
    date: new Date().toISOString().split('T')[0],
    billable: true,
  })

  const supabase = createClient()

  useEffect(() => {
    async function loadCases() {
      const { data } = await supabase
        .from("cases")
        .select(`
          id, 
          title,
          hourly_rate,
          clients (name)
        `)
        .order("title")
      
      if (data) setCases(data)
    }
    
    loadCases()
  }, [])

  const handleChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Auto-fill rate when case is selected
    if (name === "case_id" && typeof value === "string") {
      const selectedCase = cases.find(c => c.id === value)
      if (selectedCase?.hourly_rate && !formData.rate) {
        setFormData(prev => ({ ...prev, rate: selectedCase.hourly_rate.toString() }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        toast.error("Error de autenticación")
        return
      }

      const timeEntryData = {
        case_id: formData.case_id,
        user_id: user.id,
        description: formData.description,
        hours: parseFloat(formData.hours),
        rate: formData.rate ? parseFloat(formData.rate) : null,
        date: formData.date,
        billable: formData.billable,
      }

      const { error } = await supabase
        .from("time_entries")
        .insert([timeEntryData])

      if (error) {
        console.error("Error creating time entry:", error)
        toast.error("Error al registrar el tiempo: " + error.message)
        return
      }

      toast.success("Tiempo registrado exitosamente")
      router.push("/dashboard/time")
      
    } catch (err) {
      console.error("Unexpected error:", err)
      toast.error("Error inesperado al registrar el tiempo")
    } finally {
      setLoading(false)
    }
  }

  const selectedCase = cases.find(c => c.id === formData.case_id)
  const estimatedAmount = formData.hours && formData.rate 
    ? parseFloat(formData.hours) * parseFloat(formData.rate) 
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/time">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registrar Tiempo</h1>
          <p className="text-muted-foreground">Registrar tiempo trabajado en un caso</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Tiempo</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="case_id">Caso *</Label>
                  <Select
                    value={formData.case_id}
                    onValueChange={(value) => handleChange("case_id", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar caso" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((case_) => (
                        <SelectItem key={case_.id} value={case_.id}>
                          {case_.title} {case_.clients?.name && `- ${case_.clients.name}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción del Trabajo *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Describe el trabajo realizado..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hours">Horas Trabajadas *</Label>
                    <Input
                      id="hours"
                      type="number"
                      min="0"
                      step="0.25"
                      value={formData.hours}
                      onChange={(e) => handleChange("hours", e.target.value)}
                      placeholder="2.5"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rate">Tarifa por Hora (ARS)</Label>
                    <Input
                      id="rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.rate}
                      onChange={(e) => handleChange("rate", e.target.value)}
                      placeholder="15000.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleChange("date", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="billable"
                    checked={formData.billable}
                    onCheckedChange={(checked) => handleChange("billable", checked === true)}
                  />
                  <Label 
                    htmlFor="billable" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Tiempo facturable
                  </Label>
                </div>

                <div className="flex items-center gap-4">
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? "Guardando..." : "Registrar Tiempo"}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/time">
                      Cancelar
                    </Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCase && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Caso Seleccionado</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">{selectedCase.title}</p>
                    {selectedCase.clients && (
                      <p className="text-sm text-muted-foreground">{selectedCase.clients.name}</p>
                    )}
                  </div>
                </div>
              )}

              {formData.hours && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tiempo a Registrar</Label>
                  <div className="text-2xl font-bold">{formData.hours}h</div>
                </div>
              )}

              {estimatedAmount > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Monto Estimado {formData.billable ? "(Facturable)" : "(No Facturable)"}
                  </Label>
                  <div className="text-2xl font-bold text-green-600">
                    ARS {estimatedAmount.toLocaleString()}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span>Fecha:</span>
                  <span className="font-medium">
                    {new Date(formData.date).toLocaleDateString('es-ES')}
                  </span>
                </div>
                {formData.rate && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span>Tarifa/hora:</span>
                    <span className="font-medium">ARS {parseFloat(formData.rate).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
