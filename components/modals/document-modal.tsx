"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Modal } from "@/components/ui/modal"
import { createClient } from "@/lib/supabase/client"
import { FileText, Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"

const DOCUMENT_TYPES = [
  { value: "contract", label: "Contrato" },
  { value: "evidence", label: "Evidencia" },
  { value: "correspondence", label: "Correspondencia" },
  { value: "court_filing", label: "Presentación Judicial" },
  { value: "legal_brief", label: "Alegato Legal" },
  { value: "other", label: "Otro" },
]

interface DocumentModalProps {
  isOpen: boolean
  onClose: () => void
  caseId: string
  onSuccess?: () => void
}

export function DocumentModal({ isOpen, onClose, caseId, onSuccess }: DocumentModalProps) {
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [documentType, setDocumentType] = useState("")
  const [description, setDescription] = useState("")
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      // Validate each file size (max 10MB)
      const oversizedFiles = selectedFiles.filter(file => file.size > 10 * 1024 * 1024)
      if (oversizedFiles.length > 0) {
        toast.error(`${oversizedFiles.length} archivo(s) exceden el límite de 10MB`)
        return
      }
      
      // Validate total files (max 5 at once)
      if (selectedFiles.length > 5) {
        toast.error("No puedes subir más de 5 archivos a la vez")
        return
      }
      
      setFiles(selectedFiles)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (files.length === 0) {
      toast.error("Por favor selecciona al menos un archivo")
      return
    }
    
    if (!documentType) {
      toast.error("Por favor selecciona el tipo de documento")
      return
    }

    setLoading(true)
    let uploadedCount = 0
    let failedCount = 0

    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        throw new Error("Usuario no autenticado")
      }

      // Use the existing 'documents' bucket

      // Process each file
      for (const file of files) {
        try {
          // Create unique filename with timestamp and original name
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
          const fileName = `${userData.user.id}/${caseId}/${timestamp}-${file.name}`

          // Upload file to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error('Upload error for', file.name, ':', uploadError)
            failedCount++
            continue
          }

          // Save document metadata to database
          const { error: dbError } = await supabase
            .from('documents')
            .insert({
              name: file.name,
              file_path: uploadData.path,
              file_size: file.size,
              mime_type: file.type,
              document_type: documentType,
              description: description || null,
              case_id: caseId,
              uploaded_by: userData.user.id
            })

          if (dbError) {
            console.error('Database error for', file.name, ':', dbError)
            failedCount++
            continue
          }

          uploadedCount++
        } catch (fileError) {
          console.error('Error processing file', file.name, ':', fileError)
          failedCount++
        }
      }

      // Show success/error messages
      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} documento(s) subido(s) exitosamente`)
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} documento(s) no pudieron subirse`)
      }
      
      // Reset form if at least one file was uploaded successfully
      if (uploadedCount > 0) {
        setFiles([])
        setDocumentType("")
        setDescription("")
        
        // Close modal and refresh data
        onClose()
        if (onSuccess) onSuccess()
      }

    } catch (error: any) {
      console.error('Error uploading documents:', error)
      toast.error(error.message || "Error al subir los documentos")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFiles([])
      setDocumentType("")
      setDescription("")
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Subir Documento" description="Selecciona archivos para subir al caso">
      <div className="sm:max-w-md">

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file">Archivo *</Label>
            <div className="relative">
              <Input
                id="file"
                type="file"
                multiple
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                disabled={loading}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {files.length} archivo(s) seleccionado(s)
                </p>
              </div>
            )}
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <Label>Tipo de Documento *</Label>
            <Select value={documentType} onValueChange={setDocumentType} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente el contenido del documento..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || files.length === 0 || !documentType}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Documento
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
