import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { notFound } from "next/navigation"
import { EntityBreadcrumbs } from "@/components/nav/entity-breadcrumbs"
import {
  ClientHeader,
  ClientWorkspace,
  type ClientCase,
  type ClientDocument,
  type ClientNote,
  type ClientRecord,
  type ClientTask,
  type ClientTeamMember,
} from "./client-workspace"

/** Marca que deja `attachDeclarationToCase` al guardar una declaración como nota. */
const DECLARATION_MARKER = "# Declaración"

async function getClientWorkspace(id: string) {
  const supabase = await createClient()
  await requireAuth()

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !client) {
    return null
  }

  const { data: casesData } = await supabase
    .from("cases")
    .select("id, title, case_number, status, priority, start_date, end_date, created_at")
    .eq("client_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  const cases = (casesData ?? []) as ClientCase[]
  const caseIds = cases.map(c => c.id)

  // Tareas, documentos, equipo y declaraciones cuelgan del caso, no del cliente:
  // se agregan aquí para que la ficha del cliente sea la vista única del expediente.
  const [tasksResult, documentsResult, caseNotesResult, clientNotesResult, membersResult] =
    await Promise.all([
      caseIds.length
        ? supabase
            .from("tasks")
            .select("id, title, status, priority, due_date, case_id, users:assigned_to (full_name)")
            .in("case_id", caseIds)
            .is("deleted_at", null)
            .order("due_date", { ascending: true, nullsFirst: false })
        : Promise.resolve({ data: [] }),
      caseIds.length
        ? supabase
            .from("documents")
            .select("id, name, document_type, mime_type, created_at, case_id")
            .in("case_id", caseIds)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      caseIds.length
        ? supabase
            .from("notes")
            .select("id, title, content, created_at, case_id, users:created_by (full_name)")
            .in("case_id", caseIds)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase
        .from("notes")
        .select("id, title, content, created_at, case_id, users:created_by (full_name)")
        .eq("client_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      caseIds.length
        ? supabase
            .from("case_members")
            .select("case_id, user_id, role, users:user_id (full_name, email)")
            .in("case_id", caseIds)
        : Promise.resolve({ data: [] }),
    ])

  const tasks: ClientTask[] = ((tasksResult.data ?? []) as any[]).map(task => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    case_id: task.case_id,
    assignee_name: task.users?.full_name ?? null,
  }))

  const documents = (documentsResult.data ?? []) as ClientDocument[]

  const allNotes: ClientNote[] = [
    ...((caseNotesResult.data ?? []) as any[]),
    ...((clientNotesResult.data ?? []) as any[]),
  ]
    .map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      created_at: note.created_at,
      case_id: note.case_id,
      author_name: note.users?.full_name ?? null,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const isDeclaration = (note: ClientNote) => note.content.trimStart().startsWith(DECLARATION_MARKER)
  const declarations = allNotes.filter(isDeclaration)
  const notes = allNotes.filter(note => !isDeclaration(note))

  // Una persona puede estar en varios casos del mismo cliente: se colapsa en una fila.
  const teamByUser = new Map<string, ClientTeamMember>()
  for (const member of (membersResult.data ?? []) as any[]) {
    const existing = teamByUser.get(member.user_id)
    if (existing) {
      existing.case_ids.push(member.case_id)
      continue
    }
    teamByUser.set(member.user_id, {
      user_id: member.user_id,
      name: member.users?.full_name ?? "Usuario",
      email: member.users?.email ?? null,
      role: member.role ?? "member",
      case_ids: [member.case_id],
    })
  }

  return {
    client: client as ClientRecord,
    cases,
    tasks,
    documents,
    notes,
    declarations,
    team: Array.from(teamByUser.values()),
  }
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const workspace = await getClientWorkspace(resolvedParams.id)

  if (!workspace) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <EntityBreadcrumbs
        items={[
          { label: "Clientes", href: "/dashboard/clients" },
          { label: workspace.client.name },
        ]}
      />

      <ClientHeader client={workspace.client} />

      {/* useSearchParams dentro del workspace exige un límite de Suspense. */}
      <Suspense fallback={<div className="h-32 rounded-lg border border-dashed" />}>
        <ClientWorkspace
          client={workspace.client}
          cases={workspace.cases}
          tasks={workspace.tasks}
          documents={workspace.documents}
          notes={workspace.notes}
          declarations={workspace.declarations}
          team={workspace.team}
        />
      </Suspense>
    </div>
  )
}
