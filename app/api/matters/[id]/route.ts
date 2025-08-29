import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  // Get user's organization
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  const { data: matter, error } = await supabase
    .from("matters")
    .select(`
      *,
      clients (
        id,
        first_name,
        last_name,
        company_name,
        client_type,
        email,
        phone
      ),
      profiles!matters_assigned_lawyer_fkey (
        first_name,
        last_name,
        email
      )
    `)
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!matter) {
    return NextResponse.json({ error: "Matter not found" }, { status: 404 })
  }

  return NextResponse.json(matter)
}

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

    const { data: matter, error } = await supabase
      .from("matters")
      .update(body)
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
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

    if (!matter) {
      return NextResponse.json({ error: "Matter not found" }, { status: 404 })
    }

    return NextResponse.json(matter)
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

  // Archive the matter by setting status to archived
  const { data: matter, error } = await supabase
    .from("matters")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!matter) {
    return NextResponse.json({ error: "Matter not found" }, { status: 404 })
  }

  return NextResponse.json({ message: "Matter archived successfully" })
}
