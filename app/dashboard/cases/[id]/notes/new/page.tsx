"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { Loader2, ArrowLeft, StickyNote } from "lucide-react"
import Link from "next/link"

interface CaseInfo {
  id: string
  title: string
  clients: { name: string }[]
}

export default function NewNotePage({ params }: { params: Promise<{ id: string }> }) {
  const [caseId, setCaseId] = useState("")
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function initializePage() {
      const resolvedParams = await params
      setCaseId(resolvedParams.id)
      
      // Fetch case information
      const { data, error } = await supabase
        .from("cases")
        .select(`
          id,
          title,
          clients (name)
        `)
        .eq("id", resolvedParams.id)
        .single()

      if (error) {
        console.error("Error fetching case:", error)
        setError("No se pudo cargar la información del caso")
      } else {
        setCaseInfo(data)
      }
    }

    initializePage()
  }, [params, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      setError("El contenido de la nota es requerido")
      return
    }

    setLoading(true)
    setError("")

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setError("Usuario no autenticado")
        return
      }

      const noteData = {
        title: title.trim() || null,
        content: content.trim(),
        case_id: caseId,
        client_id: null, // This note is for a case, not a client directly
        is_private: isPrivate,
        created_by: userData.user.id,
      }

      const { data, error: dbError } = await supabase
        .from("notes")
        .insert([noteData])
        .select()
        .single()

      if (dbError) {
        setError(dbError.message)
      } else {
        router.push(`/dashboard/cases/${caseId}?tab=notes`)
      }
    } catch (err) {
      setError("Error inesperado. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  if (!caseInfo && !error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/cases/${caseId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Nota</h1>
          <p className="text-muted-foreground">
            {caseInfo ? `Agregar nota al caso: ${caseInfo.title}` : "Agregar nueva nota"}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            <div>
              <CardTitle>Información de la Nota</CardTitle>
              <CardDescription>Escribe una nota para este caso</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título (Opcional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título descriptivo de la nota"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Contenido *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe el contenido de la nota aquí..."
                rows={8}
                required
                disabled={loading}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isPrivate" 
                checked={isPrivate}
                onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="isPrivate" className="text-sm">
                Nota privada (solo visible para ti)
              </Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || !content.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Nota"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/dashboard/cases/${caseId}`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
