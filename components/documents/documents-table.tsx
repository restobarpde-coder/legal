"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Download, Edit, Trash2, FileText, Lock, Eye } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface Document {
  id: string
  name: string
  description: string | null
  file_path: string
  file_size: number | null
  mime_type: string | null
  document_type: string | null
  is_confidential: boolean
  version: number
  tags: string[] | null
  created_at: string
  matters: {
    id: string
    title: string
    clients: {
      first_name: string
      last_name: string
      company_name: string | null
      client_type: "individual" | "company"
    }
  } | null
  clients: {
    id: string
    first_name: string
    last_name: string
    company_name: string | null
    client_type: "individual" | "company"
  } | null
  profiles: {
    first_name: string
    last_name: string
  } | null
}

interface DocumentsTableProps {
  documents: Document[]
  canManage: boolean
}

export function DocumentsTable({ documents, canManage }: DocumentsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (documentId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este documento?")) {
      return
    }

    setDeletingId(documentId)
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert("Error al eliminar el documento")
      }
    } catch (error) {
      alert("Error al eliminar el documento")
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = (document: Document) => {
    // Simulate download - in a real app, this would download the actual file
    alert(`Descargando: ${document.name}\nRuta: ${document.file_path}`)
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-"
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  const getClientName = (client: Document["clients"] | Document["matters"]["clients"]) => {
    if (!client) return ""
    if (client.client_type === "company") {
      return client.company_name || `${client.first_name} ${client.last_name}`
    }
    return `${client.first_name} ${client.last_name}`
  }

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileText className="h-4 w-4" />

    if (mimeType.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />
    if (mimeType.includes("word")) return <FileText className="h-4 w-4 text-blue-500" />
    if (mimeType.includes("image")) return <FileText className="h-4 w-4 text-green-500" />

    return <FileText className="h-4 w-4" />
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No se encontraron documentos</p>
        {canManage && (
          <Button asChild className="mt-4">
            <Link href="/dashboard/documents/upload">Subir Primer Documento</Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Documento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Asociado a</TableHead>
            <TableHead>Tamaño</TableHead>
            <TableHead>Subido por</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {getFileIcon(document.mime_type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{document.name}</span>
                      {document.is_confidential && <Lock className="h-3 w-3 text-red-500" />}
                      {document.version > 1 && (
                        <Badge variant="outline" className="text-xs">
                          v{document.version}
                        </Badge>
                      )}
                    </div>
                    {document.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {document.description.length > 100
                          ? `${document.description.substring(0, 100)}...`
                          : document.description}
                      </p>
                    )}
                    {document.tags && document.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {document.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {document.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{document.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {document.document_type && <Badge variant="outline">{document.document_type}</Badge>}
              </TableCell>
              <TableCell>
                {document.matters ? (
                  <div>
                    <p className="font-medium">{document.matters.title}</p>
                    <p className="text-sm text-muted-foreground">{getClientName(document.matters.clients)}</p>
                  </div>
                ) : document.clients ? (
                  <div>
                    <p className="font-medium">Cliente Directo</p>
                    <p className="text-sm text-muted-foreground">{getClientName(document.clients)}</p>
                  </div>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{formatFileSize(document.file_size)}</TableCell>
              <TableCell>
                {document.profiles ? `${document.profiles.first_name} ${document.profiles.last_name}` : "Sistema"}
              </TableCell>
              <TableCell>{formatDate(document.created_at)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(document)}>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/documents/${document.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </Link>
                    </DropdownMenuItem>
                    {canManage && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/documents/${document.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(document.id)}
                          disabled={deletingId === document.id}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingId === document.id ? "Eliminando..." : "Eliminar"}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
