import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const matterId = searchParams.get("matter_id")
    const clientId = searchParams.get("client_id")
    const eventType = searchParams.get("event_type")

    let query = supabase
      .from("calendar_events")
      .select(`
        *,
        matters:matter_id (
          id,
          title,
          matter_number
        ),
        clients:client_id (
          id,
          name,
          email
        )
      `)
      .order("start_time", { ascending: true })

    if (startDate) {
      query = query.gte("start_time", startDate)
    }

    if (endDate) {
      query = query.lte("end_time", endDate)
    }

    if (matterId) {
      query = query.eq("matter_id", matterId)
    }

    if (clientId) {
      query = query.eq("client_id", clientId)
    }

    if (eventType) {
      query = query.eq("event_type", eventType)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      start_time,
      end_time,
      all_day = false,
      location,
      matter_id,
      client_id,
      event_type = "meeting",
      attendees = [],
    } = body

    if (!title || !start_time || !end_time) {
      return NextResponse.json({ error: "Title, start_time, and end_time are required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        title,
        description,
        start_time,
        end_time,
        all_day,
        location,
        matter_id,
        client_id,
        event_type,
        attendees,
        created_by: user.id,
      })
      .select(`
        *,
        matters:matter_id (
          id,
          title,
          matter_number
        ),
        clients:client_id (
          id,
          name,
          email
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
