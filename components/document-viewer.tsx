'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Download, ExternalLink, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface DocumentViewerProps {
  isOpen: boolean
  onClose: () => void
  documentId: string | null
}

interface DocumentData {
  id: string
  name: string
  description?: string
  document_type: string
  mime_type: string
  file_size: number
  created_at: string
  viewUrl: string
  canView: boolean
  previewSupported: boolean
  case?: {
    id: string
    title: string
  }
}

export function DocumentViewer({ isOpen, onClose, documentId }: DocumentViewerProps) {
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch document data when modal opens
  useEffect(() => {
    if (isOpen && documentId) {
      fetchDocument()
    } else {
      setDocument(null)
      setError(null)
    }
  }, [isOpen, documentId])

  const fetchDocument = async () => {
    if (!documentId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/${documentId}/view`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cargar documento')
      }

      const data = await response.json()
      setDocument(data)
    } catch (err) {
      console.error('Error fetching document:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar documento')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!documentId) return

    try {
      const response = await fetch(`/api/documents/${documentId}/download`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al descargar documento')
      }

      const data = await response.json()
      
      // Crear enlace temporal y hacer click automático para descargar
      const link = document.createElement('a')
      link.href = data.downloadUrl
      link.download = data.filename || 'documento'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Descarga iniciada')
    } catch (err) {
      console.error('Error downloading document:', err)
      toast.error(err instanceof Error ? err.message : 'Error al descargar documento')
    }
  }

  const openInNewTab = () => {
    if (document?.viewUrl) {
      window.open(document.viewUrl, '_blank')
    }
  }
  
  const handleDownloadInNewTab = async () => {
    if (!documentId) return

    try {
      const response = await fetch(`/api/documents/${documentId}/download`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al descargar documento')
      }

      const data = await response.json()
      
      // Abrir en nueva pestaña para descarga
      window.open(data.downloadUrl, '_blank')
      
      toast.success('Descarga iniciada en nueva pestaña')
    } catch (err) {
      console.error('Error downloading document:', err)
      toast.error(err instanceof Error ? err.message : 'Error al descargar documento')
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const getDocumentTypeLabel = (type: string) => {
    const types = {
      contract: 'Contrato',
      brief: 'Escrito',
      evidence: 'Evidencia',
      correspondence: 'Correspondencia',
      court_filing: 'Presentación Judicial',
      other: 'Otro'
    }
    return types[type as keyof typeof types] || type
  }

  const renderDocumentPreview = () => {
    if (!document || !document.canView) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Vista previa no disponible</h3>
          <p className="text-muted-foreground mb-4">
            Este tipo de archivo no se puede visualizar en el navegador
          </p>
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Descargar para ver
          </Button>
        </div>
      )
    }

    if (document.mime_type?.startsWith('image/')) {
      return (
        <div className="flex justify-center items-center h-full">
          <img
            src={document.viewUrl}
            alt={document.name}
            className="max-w-full max-h-full object-contain rounded-lg"
            onError={() => setError('Error al cargar la imagen')}
          />
        </div>
      )
    }

    if (document.mime_type === 'application/pdf') {
      return (
        <div className="h-full flex flex-col">
          <div className="border rounded-lg overflow-hidden bg-muted/10 flex-1 min-h-0">
            <iframe
              src={`${document.viewUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
              className="w-full h-full"
              title={document.name}
            />
          </div>
        </div>
      )
    }

    if (document.mime_type === 'text/plain') {
      return (
        <div className="border rounded-lg p-4 bg-muted/10 h-full overflow-auto">
          <iframe
            src={document.viewUrl}
            className="w-full h-full"
            title={document.name}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Vista previa no compatible</h3>
        <p className="text-muted-foreground mb-4">
          Descarga el archivo para verlo en tu aplicación predeterminada
        </p>
        <Button onClick={handleDownload} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Descargar archivo
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {document?.mime_type?.startsWith('image/') ? (
              <ImageIcon className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
            {document?.name || 'Documento'}
          </DialogTitle>
          {document && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {getDocumentTypeLabel(document.document_type)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(document.file_size)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {new Date(document.created_at).toLocaleDateString('es-ES')}
                </span>
                {document.case && (
                  <Badge variant="secondary" className="text-xs">
                    Caso: {document.case.title}
                  </Badge>
                )}
              </div>
              {document.description && (
                <DialogDescription className="text-sm text-muted-foreground">
                  {document.description}
                </DialogDescription>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Action buttons at top */}
          {document && (
            <div className="flex justify-between items-center gap-2 pb-4 border-b mb-4">
              <div className="flex gap-2">
                <Button onClick={openInNewTab} variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir en nueva pestaña
                </Button>
                <Button onClick={() => handleDownloadInNewTab()}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </div>
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          )}
          
          <div className="flex-1 min-h-0">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Cargando documento...</span>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {document && !loading && !error && renderDocumentPreview()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
