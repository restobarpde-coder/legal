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
    const assignedTo = searchParams.get("assigned_to")
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")

    let query = supabase
      .from("tasks")
      .select(`
        *,
        matters:matter_id (
          id,
          title,
          matter_number
        ),
        assigned_user:assigned_to (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order("created_at", { ascending: false })

    if (matterId) {
      query = query.eq("matter_id", matterId)
    }

    if (assignedTo) {
      query = query.eq("assigned_to", assignedTo)
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (priority) {
      query = query.eq("priority", priority)
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
      matter_id,
      assigned_to,
      status = "pending",
      priority = "medium",
      due_date,
      estimated_hours,
    } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title,
        description,
        matter_id,
        assigned_to,
        status,
        priority,
        due_date,
        estimated_hours,
        created_by: user.id,
      })
      .select(`
        *,
        matters:matter_id (
          id,
          title,
          matter_number
        ),
        assigned_user:assigned_to (
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
