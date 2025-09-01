"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

interface NoteModalProps {
  isOpen: boolean
  onClose: () => void
  caseId: string
  onSuccess?: () => void
}

export function NoteModal({ isOpen, onClose, caseId, onSuccess }: NoteModalProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

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
        client_id: null,
        is_private: isPrivate,
        created_by: userData.user.id,
      }

      const { error: dbError } = await supabase
        .from("notes")
        .insert([noteData])

      if (dbError) {
        setError(dbError.message)
      } else {
        // Reset form
        setTitle("")
        setContent("")
        setIsPrivate(false)
        setError("")
        
        // Close modal and trigger refresh
        onClose()
        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (err) {
      setError("Error inesperado. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setTitle("")
      setContent("")
      setIsPrivate(false)
      setError("")
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nueva Nota" description="Agrega una nota al caso">
      <div className="sm:max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
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
            rows={6}
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

        <div className="flex gap-3 pt-4">
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
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
        </form>
      </div>
    </Modal>
  )
}
