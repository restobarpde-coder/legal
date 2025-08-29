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
  const clientType = searchParams.get("type") || ""

  // Build query
  let query = supabase
    .from("clients")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  // Add search filter
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`,
    )
  }

  // Add type filter
  if (clientType) {
    query = query.eq("client_type", clientType)
  }

  const { data: clients, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(clients)
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

    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        ...body,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
