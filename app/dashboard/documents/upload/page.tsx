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
import { Loader2, ArrowLeft, Upload, File } from "lucide-react"
import Link from "next/link"

interface Case {
  id: string
  title: string
  clients: { name: string }
}

export default function UploadDocumentPage({ searchParams }: { searchParams?: { case?: string } }) {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [documentType, setDocumentType] = useState<
    "contract" | "brief" | "evidence" | "correspondence" | "court_filing" | "other"
  >("other")
  const [caseId, setCaseId] = useState("")
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchCases() {
      const { data, error } = await supabase
        .from("cases")
        .select(`
          id,
          title,
          clients (name)
        `)
        .order("title")

      if (error) {
        console.error("Error fetching cases:", error)
      } else {
        setCases(data || [])
        // Set preselected case if provided in URL
        if (searchParams?.case) {
          setCaseId(searchParams.case)
        }
      }
    }

    fetchCases()
  }, [supabase, searchParams])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!name) {
        setName(selectedFile.name)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError("Por favor selecciona un archivo")
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

      // Upload file to storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      // Organize files by user and optionally by case
      const folderPath = caseId && caseId !== 'none' ? `${userData.user.id}/cases/${caseId}` : `${userData.user.id}/general`
      const filePath = `${folderPath}/${fileName}`

      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file)

      if (uploadError) {
        setError(`Error subiendo archivo: ${uploadError.message}`)
        return
      }

      // Save document metadata
      const documentData = {
        name,
        description,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        document_type: documentType,
        case_id: caseId === 'none' || !caseId ? null : caseId,
        uploaded_by: userData.user.id,
      }

      const { data, error: dbError } = await supabase.from("documents").insert([documentData]).select().single()

      if (dbError) {
        setError(dbError.message)
        // Clean up uploaded file
        await supabase.storage.from("documents").remove([filePath])
      } else {
        router.push("/dashboard/documents")
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
          <Link href="/dashboard/documents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subir Documento</h1>
          <p className="text-muted-foreground">Agrega un nuevo documento a tu estudio jurídico</p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Información del Documento</CardTitle>
          <CardDescription>Completa los detalles del documento a subir</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* File upload */}
            <div className="space-y-2">
              <Label htmlFor="file">Archivo *</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <div className="text-center">
                  {file ? (
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <File className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  )}
                  <p className="text-sm text-muted-foreground mb-2">
                    {file ? "Archivo seleccionado" : "Arrastra un archivo aquí o haz clic para seleccionar"}
                  </p>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("file")?.click()}
                    disabled={loading}
                  >
                    {file ? "Cambiar Archivo" : "Seleccionar Archivo"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Documento *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre descriptivo del documento"
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
                placeholder="Describe el contenido del documento..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documentType">Tipo de Documento</Label>
                <Select
                  value={documentType}
                  onValueChange={(
                    value: "contract" | "brief" | "evidence" | "correspondence" | "court_filing" | "other",
                  ) => setDocumentType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contrato</SelectItem>
                    <SelectItem value="brief">Escrito</SelectItem>
                    <SelectItem value="evidence">Evidencia</SelectItem>
                    <SelectItem value="correspondence">Correspondencia</SelectItem>
                    <SelectItem value="court_filing">Presentación Judicial</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
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
                        {case_.title} - {case_.clients?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || !file || !name}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  "Subir Documento"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/documents">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
