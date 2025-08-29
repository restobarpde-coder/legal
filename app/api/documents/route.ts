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
  const documentType = searchParams.get("document_type") || ""
  const matterId = searchParams.get("matter_id") || ""
  const clientId = searchParams.get("client_id") || ""
  const isConfidential = searchParams.get("is_confidential")

  // Build query with related data
  let query = supabase
    .from("documents")
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
      ),
      profiles!documents_uploaded_by_fkey (
        first_name,
        last_name
      )
    `)
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })

  // Add search filter
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,document_type.ilike.%${search}%`)
  }

  // Add filters
  if (documentType) {
    query = query.eq("document_type", documentType)
  }

  if (matterId) {
    query = query.eq("matter_id", matterId)
  }

  if (clientId) {
    query = query.eq("client_id", clientId)
  }

  if (isConfidential !== null) {
    query = query.eq("is_confidential", isConfidential === "true")
  }

  const { data: documents, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(documents)
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

    const { data: document, error } = await supabase
      .from("documents")
      .insert({
        ...body,
        organization_id: profile.organization_id,
        uploaded_by: user.id,
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
        ),
        profiles!documents_uploaded_by_fkey (
          first_name,
          last_name
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
