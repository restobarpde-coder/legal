import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { notFound } from "next/navigation"
import { EntityBreadcrumbs } from "@/components/nav/entity-breadcrumbs"
import {
  ClientHeader,
  ClientWorkspace,
  type ClientCaseSummary,
  type ClientRecord,
} from "./client-workspace"

type CaseRollup = {
  openTaskCount: number
  lastActivityAt: string | null
}

function trackActivity(rollup: CaseRollup, createdAt: string | null) {
  if (!createdAt) return
  if (!rollup.lastActivityAt || new Date(createdAt) > new Date(rollup.lastActivityAt)) {
    rollup.lastActivityAt = createdAt
  }
}

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

  // El cliente no expone contenido de sus casos. Estas consultas solo alimentan
  // dos señales por caso: cuánto trabajo abierto tiene y cuándo se movió por
  // última vez. Documentos, declaraciones, notas y fotos se ven dentro del caso.
  const [tasksResult, documentsResult, notesResult] = await Promise.all([
    caseIds.length
      ? supabase
          .from("tasks")
          .select("status, created_at, case_id")
          .in("case_id", caseIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    caseIds.length
      ? supabase
          .from("documents")
          .select("created_at, case_id")
          .in("case_id", caseIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] }),
    caseIds.length
      ? supabase
          .from("notes")
          .select("created_at, case_id")
          .in("case_id", caseIds)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] }),
  ])

  const rollupByCase = new Map<string, CaseRollup>(
    caseIds.map(caseId => [caseId, { openTaskCount: 0, lastActivityAt: null }])
  )

  for (const task of (tasksResult.data ?? []) as any[]) {
    const rollup = rollupByCase.get(task.case_id)
    if (!rollup) continue
    if (task.status !== "completed" && task.status !== "cancelled") {
      rollup.openTaskCount += 1
    }
    trackActivity(rollup, task.created_at)
  }
  for (const record of [
    ...((documentsResult.data ?? []) as any[]),
    ...((notesResult.data ?? []) as any[]),
  ]) {
    const rollup = rollupByCase.get(record.case_id)
    if (rollup) trackActivity(rollup, record.created_at)
  }

  const caseSummaries: ClientCaseSummary[] = cases
    .map(case_ => ({
      ...(case_ as Omit<ClientCaseSummary, keyof CaseRollup>),
      ...(rollupByCase.get(case_.id) ?? { openTaskCount: 0, lastActivityAt: null }),
    }))
    .sort(
      (a, b) =>
        new Date(b.lastActivityAt ?? b.created_at).getTime() -
        new Date(a.lastActivityAt ?? a.created_at).getTime()
    )

  return { client: client as ClientRecord, cases: caseSummaries }
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
        <ClientWorkspace client={workspace.client} cases={workspace.cases} />
      </Suspense>
    </div>
  )
}
