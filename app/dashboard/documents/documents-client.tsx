'use client'

import { useState, useMemo, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Download, Eye, MoreHorizontal, FileText, File } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DocumentViewer } from "@/components/document-viewer"
import { toast } from 'sonner'

interface Document {
  id: string
  name: string
  description?: string
  document_type: string
  mime_type: string
  file_size: number
  file_path: string
  created_at: string
  cases?: {
    id: string
    title: string
    clients?: {
      name: string
    }
  }
  users?: {
    full_name: string
  }
}

// Helper functions fuera del componente para evitar recreación
const getDocumentIcon = (mimeType: string | null) => {
  if (!mimeType) return File
  if (mimeType.includes("pdf")) return FileText
  if (mimeType.includes("word")) return FileText
  if (mimeType.includes("image")) return File
  return File
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "Desconocido"
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
}

const getDocumentTypeColor = (type: string) => {
  switch (type) {
    case "contract":
      return "default"
    case "brief":
      return "secondary"
    case "evidence":
      return "outline"
    case "correspondence":
      return "default"
    case "court_filing":
      return "secondary"
    default:
      return "outline"
  }
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

// Componente memoizado
const DocumentsClient = memo(function DocumentsClient() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)

  // Usar React Query en vez de useState + useEffect
  const { data: documents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await fetch('/api/documents')
      if (!response.ok) throw new Error('Error al cargar documentos')
      return response.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  const handleViewDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/view`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cargar documento')
      }
      
      const data = await response.json()
      
      // Abrir documento en nueva pestaña
      window.open(data.viewUrl, '_blank')
      
    } catch (err) {
      console.error('Error viewing document:', err)
      toast.error(err instanceof Error ? err.message : 'Error al abrir documento')
    }
  }

  const handleDownloadDocument = async (documentId: string, documentName: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al descargar documento')
      }
      
      const data = await response.json()
      
      // Abrir descarga en nueva pestaña
      window.open(data.downloadUrl, '_blank')
      
      toast.success('Descarga iniciada en nueva pestaña')
    } catch (err) {
      console.error('Error downloading document:', err)
      toast.error(err instanceof Error ? err.message : 'Error al descargar documento')
    }
  }

  const handleViewInModal = (documentId: string) => {
    setSelectedDocumentId(documentId)
    setDocumentViewerOpen(true)
  }

  // Filtrado optimizado con useMemo
  const filteredDocuments = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase()
    return documents.filter((doc: Document) => {
      const matchesSearch = doc.name.toLowerCase().includes(lowerSearch) ||
                           (doc.description && doc.description.toLowerCase().includes(lowerSearch))
      const matchesType = typeFilter === "all" || doc.document_type === typeFilter
      return matchesSearch && matchesType
    })
  }, [documents, searchTerm, typeFilter])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
            <p className="text-muted-foreground">Gestiona todos los documentos de tu estudio jurídico</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Cargando documentos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
            <p className="text-muted-foreground">Gestiona todos los documentos de tu estudio jurídico</p>
          </div>
        </div>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error instanceof Error ? error.message : 'Error al cargar documentos'}</p>
          <Button onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">Gestiona todos los documentos de tu estudio jurídico</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/documents/upload">
            <Plus className="h-4 w-4 mr-2" />
            Subir Documento
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar documentos..." 
                className="pl-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="contract">Contrato</SelectItem>
                <SelectItem value="brief">Escrito</SelectItem>
                <SelectItem value="evidence">Evidencia</SelectItem>
                <SelectItem value="correspondence">Correspondencia</SelectItem>
                <SelectItem value="court_filing">Presentación Judicial</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents list */}
      <div className="grid gap-4">
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {documents.length === 0 ? "No hay documentos" : "No se encontraron documentos"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {documents.length === 0 ? 
                    "Comienza subiendo tu primer documento" : 
                    "Prueba con otros criterios de búsqueda"}
                </p>
                {documents.length === 0 && (
                  <Button asChild>
                    <Link href="/dashboard/documents/upload">
                      <Plus className="h-4 w-4 mr-2" />
                      Subir Primer Documento
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map((document: Document) => {
            const IconComponent = getDocumentIcon(document.mime_type)
            return (
              <Card key={document.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="p-2 bg-muted rounded-lg">
                        <IconComponent className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold truncate">{document.name}</h3>
                          <Badge variant={getDocumentTypeColor(document.document_type)}>
                            {getDocumentTypeLabel(document.document_type)}
                          </Badge>
                        </div>
                        {document.description && (
                          <p className="text-muted-foreground mb-3 line-clamp-2">{document.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {document.cases && (
                            <span>
                              <strong>Caso:</strong> {document.cases.title} - {document.cases.clients?.name}
                            </span>
                          )}
                          <span>
                            <strong>Tamaño:</strong> {formatFileSize(document.file_size)}
                          </span>
                          <span>
                            <strong>Subido por:</strong> {document.users?.full_name}
                          </span>
                          <span>
                            <strong>Fecha:</strong> {new Date(document.created_at).toLocaleDateString("es-ES")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDocument(document.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver en nueva pestaña
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewInModal(document.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver en modal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadDocument(document.id, document.name)}>
                          <Download className="h-4 w-4 mr-2" />
                          Descargar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewer
        isOpen={documentViewerOpen}
        onClose={() => {
          setDocumentViewerOpen(false)
          setSelectedDocumentId(null)
        }}
        documentId={selectedDocumentId}
      />
    </div>
  )
})

export default DocumentsClient
