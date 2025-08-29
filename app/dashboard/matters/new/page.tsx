import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MatterForm } from "@/components/matters/matter-form"

export default async function NewMatterPage() {
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
    redirect("/dashboard/matters")
  }

  // Get clients for the form
  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name, company_name, client_type")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("first_name")

  // Get lawyers for assignment
  const { data: lawyers } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("organization_id", profile.organization_id)
    .in("role", ["admin", "lawyer"])
    .eq("is_active", true)
    .order("first_name")

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nuevo Caso</h1>
        <p className="text-muted-foreground">Crea un nuevo caso legal</p>
      </div>

      <MatterForm clients={clients || []} lawyers={lawyers || []} />
    </div>
  )
}
