import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DocumentUploadForm } from "@/components/documents/document-upload-form"

export default async function DocumentUploadPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check user permissions
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", data.user.id)
    .single()

  if (!profile || !["admin", "lawyer", "assistant"].includes(profile.role)) {
    redirect("/dashboard/documents")
  }

  // Get matters and clients for the form
  const { data: matters } = await supabase
    .from("matters")
    .select("id, title, clients(first_name, last_name, company_name, client_type)")
    .eq("organization_id", profile.organization_id)
    .neq("status", "archived")
    .order("title")

  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name, company_name, client_type")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("first_name")

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Subir Documento</h1>
        <p className="text-muted-foreground">Agrega un nuevo documento al sistema</p>
      </div>

      <DocumentUploadForm matters={matters || []} clients={clients || []} />
    </div>
  )
}
