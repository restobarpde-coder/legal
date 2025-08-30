"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ClientData {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  address: string | null
  notes: string | null
}

export default function EditClientPage({ params }: { params: { id: string } }) {
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchClient() {
      try {
        const { data: clientData, error } = await supabase.from("clients").select("*").eq("id", params.id).single()

        if (error) {
          setError("Cliente no encontrado")
          return
        }

        setClientData(clientData)
        setName(clientData.name)
        setEmail(clientData.email || "")
        setPhone(clientData.phone || "")
        setCompany(clientData.company || "")
        setAddress(clientData.address || "")
        setNotes(clientData.notes || "")
      } catch (err) {
        setError("Error cargando los datos del cliente")
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [params.id, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const updateData = {
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        address: address || null,
        notes: notes || null,
      }

      const { error } = await supabase.from("clients").update(updateData).eq("id", params.id)

      if (error) {
        setError(error.message)
      } else {
        router.push(`/dashboard/clients/${params.id}`)
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

  if (!clientData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Cliente no encontrado</h2>
        <Button asChild>
          <Link href="/dashboard/clients">Volver a Clientes</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/clients/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Cliente</h1>
          <p className="text-muted-foreground">Modifica los detalles del cliente</p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
          <CardDescription>Actualiza los detalles del cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={saving} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} disabled={saving} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                disabled={saving}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving || !name}>
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
                <Link href={`/dashboard/clients/${params.id}`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
