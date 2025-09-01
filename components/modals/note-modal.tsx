"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useCreateNote } from "@/hooks/use-notes"

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
  
  const createNoteMutation = useCreateNote()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      toast.error("El contenido de la nota es requerido")
      return
    }

    createNoteMutation.mutate(
      {
        caseId,
        title: title.trim() || undefined,
        content: content.trim(),
        isPrivate,
      },
      {
        onSuccess: () => {
          toast.success("Nota creada exitosamente")
          
          // Reset form
          setTitle("")
          setContent("")
          setIsPrivate(false)
          
          // Close modal
          onClose()
          if (onSuccess) {
            onSuccess()
          }
        },
        onError: (error) => {
          toast.error(error.message || "Error al crear la nota")
        },
      }
    )
  }

  const handleClose = () => {
    if (!createNoteMutation.isPending) {
      setTitle("")
      setContent("")
      setIsPrivate(false)
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nueva Nota" description="Agrega una nota al caso">
      <div className="sm:max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Título (Opcional)</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título descriptivo de la nota"
            disabled={createNoteMutation.isPending}
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
            disabled={createNoteMutation.isPending}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="isPrivate" 
            checked={isPrivate}
            onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
            disabled={createNoteMutation.isPending}
          />
          <Label htmlFor="isPrivate" className="text-sm">
            Nota privada (solo visible para ti)
          </Label>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={createNoteMutation.isPending || !content.trim()}>
            {createNoteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Nota"
            )}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose} disabled={createNoteMutation.isPending}>
            Cancelar
          </Button>
        </div>
        </form>
      </div>
    </Modal>
  )
}
