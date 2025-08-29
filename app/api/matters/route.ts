import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user's organization
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  // Get search parameters
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || ""
  const priority = searchParams.get("priority") || ""
  const clientId = searchParams.get("client_id") || ""

  // Build query with client information
  let query = supabase
    .from("matters")
    .select(`
      *,
      clients (
        id,
        first_name,
        last_name,
        company_name,
        client_type
      ),
      profiles!matters_assigned_lawyer_fkey (
        first_name,
        last_name
      )
    `)
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })

  // Add search filter
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,matter_type.ilike.%${search}%`)
  }

  // Add status filter
  if (status) {
    query = query.eq("status", status)
  }

  // Add priority filter
  if (priority) {
    query = query.eq("priority", priority)
  }

  // Add client filter
  if (clientId) {
    query = query.eq("client_id", clientId)
  }

  const { data: matters, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(matters)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user's organization
  const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

  if (!profile || !["admin", "lawyer", "assistant"].includes(profile.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  try {
    const body = await request.json()

    const { data: matter, error } = await supabase
      .from("matters")
      .insert({
        ...body,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select(`
        *,
        clients (
          id,
          first_name,
          last_name,
          company_name,
          client_type
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(matter, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
