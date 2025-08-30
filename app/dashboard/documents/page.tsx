import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { Plus, Search, Download, Eye, MoreHorizontal, FileText, File } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

async function getDocuments() {
  const supabase = await createClient()
  await requireAuth()

  const { data: documents, error } = await supabase
    .from("documents")
    .select(`
      *,
      cases (
        id,
        title,
        clients (name)
      ),
      users (
        full_name
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching documents:", error)
    return []
  }

  return documents || []
}

function getDocumentIcon(mimeType: string | null) {
  if (!mimeType) return File

  if (mimeType.includes("pdf")) return FileText
  if (mimeType.includes("word")) return FileText
  if (mimeType.includes("image")) return File
  return File
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "Desconocido"

  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
}

function getDocumentTypeColor(type: string) {
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

export default async function DocumentsPage() {
  const documents = await getDocuments()

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
              <Input placeholder="Buscar documentos..." className="pl-9" />
            </div>
            <Select defaultValue="all">
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
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Caso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los casos</SelectItem>
                {/* This would be populated with actual cases */}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents list */}
      <div className="grid gap-4">
        {documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay documentos</h3>
                <p className="text-muted-foreground mb-4">Comienza subiendo tu primer documento</p>
                <Button asChild>
                  <Link href="/dashboard/documents/upload">
                    <Plus className="h-4 w-4 mr-2" />
                    Subir Primer Documento
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          documents.map((document) => {
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
                          <Badge variant={getDocumentTypeColor(document.document_type)}>{document.document_type}</Badge>
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
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </DropdownMenuItem>
                        <DropdownMenuItem>
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
    </div>
  )
}
