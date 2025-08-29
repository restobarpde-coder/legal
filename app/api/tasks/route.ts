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
  const assignedTo = searchParams.get("assigned_to") || ""
  const matterId = searchParams.get("matter_id") || ""

  // Build query with related data
  let query = supabase
    .from("tasks")
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
      profiles!tasks_assigned_to_fkey (
        first_name,
        last_name
      )
    `)
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })

  // Add search filter
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  }

  // Add filters
  if (status) {
    query = query.eq("status", status)
  }

  if (priority) {
    query = query.eq("priority", priority)
  }

  if (assignedTo) {
    query = query.eq("assigned_to", assignedTo)
  }

  if (matterId) {
    query = query.eq("matter_id", matterId)
  }

  const { data: tasks, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(tasks)
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

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        ...body,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
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
        profiles!tasks_assigned_to_fkey (
          first_name,
          last_name
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
