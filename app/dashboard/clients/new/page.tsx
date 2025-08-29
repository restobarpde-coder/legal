import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ClientForm } from "@/components/clients/client-form"

export default async function NewClientPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check user permissions
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single()

  if (!profile || !["admin", "lawyer", "assistant"].includes(profile.role)) {
    redirect("/dashboard/clients")
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nuevo Cliente</h1>
        <p className="text-muted-foreground">Agrega un nuevo cliente al sistema</p>
      </div>

      <ClientForm />
    </div>
  )
}
