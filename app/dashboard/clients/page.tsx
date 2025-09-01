import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { Plus, Search, Eye, Edit, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ClientPageHeader } from "./client-page-header"
import { ClientsTable } from "./clients-table"

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
  users: { full_name: string } | null;
  cases?: { id: string, status: string }[];
};

async function getClients(searchQuery?: string): Promise<Client[]> {
  const supabase = await createClient()
  await requireAuth()

  let query = supabase
    .from("clients")
    .select(`
      id,
      name,
      email,
      phone,
      company,
      created_at,
      users ( full_name )
    `)
    .order("created_at", { ascending: false })

  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching clients:", error.message)
    // In a real app, you'd want to handle this more gracefully
    // For now, we'll return an empty array and log the error.
    return []
  }

  return data as Client[]
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const resolvedSearchParams = await searchParams
  const searchQuery = resolvedSearchParams?.q || ""
  const clients = await getClients(searchQuery)

  return (
    <div className="space-y-6">
      <ClientPageHeader />
      <ClientsTable initialClients={clients} />
    </div>
  )
}
