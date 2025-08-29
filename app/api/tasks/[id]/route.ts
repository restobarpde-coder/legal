import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user's organization and role
  const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

  if (!profile || !["admin", "lawyer", "assistant"].includes(profile.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  try {
    const body = await request.json()

    // If marking as completed, set completed_at timestamp
    if (body.status === "completed" && !body.completed_at) {
      body.completed_at = new Date().toISOString()
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .update(body)
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
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

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user's organization and role
  const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single()

  if (!profile || !["admin", "lawyer"].includes(profile.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("organization_id", profile.organization_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: "Task deleted successfully" })
}
