import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { AudioRecorder } from "@/components/audio-recorder"
import { EntityBreadcrumbs } from "@/components/nav/entity-breadcrumbs"
import { getCasesForSelection, getClientsForSelection } from './actions'

export default async function DeclarationsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; case?: string }>
}) {
  await requireAuth()

  const { client: clientId, case: caseId } = await searchParams
  const cases = await getCasesForSelection()
  const clients = await getClientsForSelection()

  // La declaración termina adjunta a un CASO. Si llegamos desde un caso o desde
  // un cliente, se acota la selección a ese contexto.
  const contextCase = caseId ? cases.find(c => c.id === caseId) : undefined
  const contextClientId = contextCase?.client_id ?? clientId
  const contextClient = contextClientId ? clients.find(c => c.id === contextClientId) : undefined
  const visibleCases = contextClient ? cases.filter(c => c.client_id === contextClient.id) : cases

  return (
    <div className="space-y-6">
      {contextClient && (
        <EntityBreadcrumbs
          items={[
            { label: "Clientes", href: "/dashboard/clients" },
            { label: contextClient.name, href: `/dashboard/clients/${contextClient.id}?tab=casos` },
            ...(contextCase
              ? [{ label: contextCase.title, href: `/dashboard/cases/${contextCase.id}?tab=declarations` }]
              : []),
            { label: "Nueva declaración" },
          ]}
        />
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Declaraciones</h1>
        <p className="text-muted-foreground">
          {contextCase
            ? `Grabá una declaración y quedará adjunta al caso "${contextCase.title}"`
            : contextClient
              ? `Grabá una declaración para ${contextClient.name} y adjuntala a uno de sus casos`
              : "Graba y procesa declaraciones. Cada una queda adjunta a un caso."}
        </p>
      </div>

      <AudioRecorder
        cases={visibleCases}
        clients={clients}
        defaultCaseId={caseId ?? (visibleCases.length === 1 ? visibleCases[0].id : '')}
        defaultClientId={contextClient?.id ?? ''}
      />

      {contextCase ? (
        <p className="text-sm text-muted-foreground">
          ¿Buscás las declaraciones ya guardadas?{" "}
          <Link
            href={`/dashboard/cases/${contextCase.id}?tab=declarations`}
            className="text-primary hover:underline"
          >
            Verlas en el caso
          </Link>
          .
        </p>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Cada declaración queda guardada dentro del caso al que la adjuntás, en su
            pestaña <strong>Declaraciones</strong>.
          </p>
        </div>
      )}
    </div>
  )
}
