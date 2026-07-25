import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { notFound } from "next/navigation"
import { EntityBreadcrumbs } from "@/components/nav/entity-breadcrumbs"
import { isDeclarationNote } from "@/lib/declarations"
import {
  ClientHeader,
  ClientWorkspace,
  type ActivityItem,
  type ClientCaseSummary,
  type ClientRecord,
  type ClientTeamMember,
} from "./client-workspace"

const RECENT_ACTIVITY_LIMIT = 6

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

  const cases = casesData ?? []
  const caseIds = cases.map(c => c.id)

  // Tareas, documentos, notas y declaraciones pertenecen al CASO. Acá solo se
  // leen para contar por caso y armar la actividad reciente del cliente; el
  // trabajo sobre ellas se hace dentro del caso correspondiente.
  const [tasksResult, documentsResult, notesResult, membersResult] = await Promise.all([
    caseIds.length
      ? supabase
          .from("tasks")
          .select("id, title, status, created_at, case_id")
          .in("case_id", caseIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    caseIds.length
      ? supabase
          .from("documents")
          .select("id, name, created_at, case_id")
          .in("case_id", caseIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    caseIds.length
      ? supabase
          .from("notes")
          .select("id, title, content, created_at, case_id")
          .in("case_id", caseIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    caseIds.length
      ? supabase
          .from("case_members")
          .select("case_id, user_id, role, users:user_id (full_name, email)")
          .in("case_id", caseIds)
      : Promise.resolve({ data: [] }),
  ])

  const tasks = (tasksResult.data ?? []) as any[]
  const documents = (documentsResult.data ?? []) as any[]
  const notes = (notesResult.data ?? []) as any[]

  const countsByCase = new Map(
    caseIds.map(caseId => [
      caseId,
      { taskCount: 0, openTaskCount: 0, documentCount: 0, noteCount: 0, declarationCount: 0 },
    ])
  )

  for (const task of tasks) {
    const counts = countsByCase.get(task.case_id)
    if (!counts) continue
    counts.taskCount += 1
    if (task.status !== "completed" && task.status !== "cancelled") {
      counts.openTaskCount += 1
    }
  }
  for (const document of documents) {
    const counts = countsByCase.get(document.case_id)
    if (counts) counts.documentCount += 1
  }
  for (const note of notes) {
    const counts = countsByCase.get(note.case_id)
    if (!counts) continue
    if (isDeclarationNote(note.content)) {
      counts.declarationCount += 1
    } else {
      counts.noteCount += 1
    }
  }

  const caseSummaries: ClientCaseSummary[] = cases.map(case_ => ({
    ...(case_ as Omit<ClientCaseSummary, "taskCount" | "openTaskCount" | "documentCount" | "noteCount" | "declarationCount">),
    ...(countsByCase.get(case_.id) ?? {
      taskCount: 0,
      openTaskCount: 0,
      documentCount: 0,
      noteCount: 0,
      declarationCount: 0,
    }),
  }))

  const recentActivity: ActivityItem[] = [
    ...tasks.map(task => ({
      id: task.id,
      kind: "task" as const,
      title: task.title,
      case_id: task.case_id,
      date: task.created_at,
    })),
    ...documents.map(document => ({
      id: document.id,
      kind: "document" as const,
      title: document.name,
      case_id: document.case_id,
      date: document.created_at,
    })),
    ...notes.map(note => ({
      id: note.id,
      kind: isDeclarationNote(note.content) ? ("declaration" as const) : ("note" as const),
      title: note.title || (isDeclarationNote(note.content) ? "Declaración grabada" : "Nota sin título"),
      case_id: note.case_id,
      date: note.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT)

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
    cases: caseSummaries,
    team: Array.from(teamByUser.values()),
    recentActivity,
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
          team={workspace.team}
          recentActivity={workspace.recentActivity}
        />
      </Suspense>
    </div>
  )
}
