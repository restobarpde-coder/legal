import { ClientForm } from "../../client-form"
import { updateClient } from "../../actions"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"

async function getClient(id: string) {
  const supabase = await createClient()
  await requireAuth()

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching client for edit:", error)
    notFound()
  }

  return data
}

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const client = await getClient(resolvedParams.id)
  const updateClientWithId = updateClient.bind(null, client.id)

  return (
    <div className="max-w-4xl mx-auto">
      <ClientForm client={client} formAction={updateClientWithId} />
    </div>
  )
}
