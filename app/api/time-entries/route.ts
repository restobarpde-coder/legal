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
    const matterId = searchParams.get("matter_id")
    const userId = searchParams.get("user_id")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const isBillable = searchParams.get("is_billable")

    let query = supabase
      .from("time_entries")
      .select(`
        *,
        matters:matter_id (
          id,
          title,
          matter_number
        ),
        tasks:task_id (
          id,
          title
        ),
        profiles:user_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order("date", { ascending: false })

    if (matterId) {
      query = query.eq("matter_id", matterId)
    }

    if (userId) {
      query = query.eq("user_id", userId)
    }

    if (startDate) {
      query = query.gte("date", startDate)
    }

    if (endDate) {
      query = query.lte("date", endDate)
    }

    if (isBillable !== null) {
      query = query.eq("is_billable", isBillable === "true")
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
    const { matter_id, task_id, description, hours, hourly_rate, date, is_billable = true } = body

    if (!matter_id || !description || !hours || !hourly_rate) {
      return NextResponse.json(
        { error: "matter_id, description, hours, and hourly_rate are required" },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        matter_id,
        task_id,
        user_id: user.id,
        description,
        hours,
        hourly_rate,
        date: date || new Date().toISOString().split("T")[0],
        is_billable,
      })
      .select(`
        *,
        matters:matter_id (
          id,
          title,
          matter_number
        ),
        tasks:task_id (
          id,
          title
        ),
        profiles:user_id (
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
