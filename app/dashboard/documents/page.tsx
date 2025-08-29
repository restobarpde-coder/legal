import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { DocumentsTable } from "@/components/documents/documents-table"
import { DocumentsSearch } from "@/components/documents/documents-search"

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string
    document_type?: string
    matter_id?: string
    client_id?: string
    is_confidential?: string
  }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", data.user.id)
    .single()

  if (!profile) {
    redirect("/auth/login")
  }

  // Build query for documents
  let query = supabase
    .from("documents")
    .select(`
      *,
      matters (
        id,
        title,
        clients (
          first_name,
          last_name,
          company_name,
          client_type
        )
      ),
      clients (
        id,
        first_name,
        last_name,
        company_name,
        client_type
      ),
      profiles!documents_uploaded_by_fkey (
        first_name,
        last_name
      )
    `)
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })

  // Add filters
  if (params.search) {
    query = query.or(
      `name.ilike.%${params.search}%,description.ilike.%${params.search}%,document_type.ilike.%${params.search}%`,
    )
  }

  if (params.document_type) {
    query = query.eq("document_type", params.document_type)
  }

  if (params.matter_id) {
    query = query.eq("matter_id", params.matter_id)
  }

  if (params.client_id) {
    query = query.eq("client_id", params.client_id)
  }

  if (params.is_confidential !== undefined) {
    query = query.eq("is_confidential", params.is_confidential === "true")
  }

  const { data: documents, error: documentsError } = await query

  if (documentsError) {
    console.error("Error fetching documents:", documentsError)
  }

  // Get matters and clients for filters
  const { data: matters } = await supabase
    .from("matters")
    .select("id, title")
    .eq("organization_id", profile.organization_id)
    .neq("status", "archived")
    .order("title")

  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name, company_name, client_type")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("first_name")

  const canManageDocuments = ["admin", "lawyer", "assistant"].includes(profile.role)

  // Calculate statistics
  const totalDocuments = documents?.length || 0
  const confidentialDocs = documents?.filter((d) => d.is_confidential).length || 0
  const recentDocs =
    documents?.filter((d) => {
      const created = new Date(d.created_at)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return created >= weekAgo
    }).length || 0

  // Calculate total file size (simulated)
  const totalSize = documents?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1)

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Gestiona los documentos legales del estudio</p>
        </div>
        {canManageDocuments && (
          <Button asChild>
            <Link href="/dashboard/documents/upload">Subir Documento</Link>
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <DocumentsSearch matters={matters || []} clients={clients || []} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDocuments}</div>
              <p className="text-xs text-muted-foreground">Archivos almacenados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confidenciales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{confidentialDocs}</div>
              <p className="text-xs text-muted-foreground">Acceso restringido</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentDocs}</div>
              <p className="text-xs text-muted-foreground">Documentos nuevos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Almacenamiento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSizeMB} MB</div>
              <p className="text-xs text-muted-foreground">Espacio utilizado</p>
            </CardContent>
          </Card>
        </div>

        <DocumentsTable documents={documents || []} canManage={canManageDocuments} />
      </div>
    </div>
  )
}
