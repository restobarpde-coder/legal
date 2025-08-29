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
    const clientId = searchParams.get("client_id")
    const status = searchParams.get("status")
    const assignedLawyer = searchParams.get("assigned_lawyer")

    let query = supabase
      .from("matters")
      .select(`
        *,
        clients:client_id (
          id,
          name,
          email
        ),
        profiles:assigned_lawyer (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order("created_at", { ascending: false })

    if (clientId) {
      query = query.eq("client_id", clientId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (assignedLawyer) {
      query = query.eq("assigned_lawyer", assignedLawyer)
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
      client_id,
      status = "open",
      priority = "medium",
      practice_area,
      assigned_lawyer,
      hourly_rate,
      budget,
      start_date,
      end_date,
    } = body

    if (!title || !client_id) {
      return NextResponse.json({ error: "Title and client_id are required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("matters")
      .insert({
        title,
        description,
        client_id,
        status,
        priority,
        practice_area,
        assigned_lawyer,
        hourly_rate,
        budget,
        start_date,
        end_date,
        created_by: user.id,
      })
      .select(`
        *,
        clients:client_id (
          id,
          name,
          email
        ),
        profiles:assigned_lawyer (
          id,
          first_name,
          last_name,
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
