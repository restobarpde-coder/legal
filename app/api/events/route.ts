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
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const eventType = searchParams.get("event_type") || ""

  // Build query with related data
  let query = supabase
    .from("events")
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
      )
    `)
    .eq("organization_id", profile.organization_id)
    .order("start_time", { ascending: true })

  // Add date range filter
  if (startDate) {
    query = query.gte("start_time", startDate)
  }

  if (endDate) {
    query = query.lte("end_time", endDate)
  }

  // Add event type filter
  if (eventType) {
    query = query.eq("event_type", eventType)
  }

  const { data: events, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(events)
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

    const { data: event, error } = await supabase
      .from("events")
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

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
