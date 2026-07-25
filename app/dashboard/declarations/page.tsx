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

  // Al entrar desde la ficha de un cliente solo se ofrecen sus casos.
  const contextClient = clientId ? clients.find(c => c.id === clientId) : undefined
  const visibleCases = contextClient ? cases.filter(c => c.client_id === contextClient.id) : cases

  return (
    <div className="space-y-6">
      {contextClient && (
        <EntityBreadcrumbs
          items={[
            { label: "Clientes", href: "/dashboard/clients" },
            { label: contextClient.name, href: `/dashboard/clients/${contextClient.id}` },
            { label: "Declaraciones" },
          ]}
        />
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Declaraciones</h1>
        <p className="text-muted-foreground">
          {contextClient
            ? `Grabá una declaración para ${contextClient.name} y adjuntala a uno de sus casos`
            : "Graba y procesa declaraciones de clientes"}
        </p>
      </div>

      <AudioRecorder
        cases={visibleCases}
        clients={clients}
        defaultCaseId={caseId ?? (visibleCases.length === 1 ? visibleCases[0].id : '')}
        defaultClientId={contextClient?.id ?? ''}
      />

      {contextClient ? (
        <p className="text-sm text-muted-foreground">
          ¿Buscás las declaraciones ya guardadas?{" "}
          <Link
            href={`/dashboard/clients/${contextClient.id}?tab=declaraciones`}
            className="text-primary hover:underline"
          >
            Verlas en la ficha del cliente
          </Link>
          .
        </p>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Cada declaración queda guardada dentro del caso al que la adjuntás, y se ve en la
            pestaña <strong>Declaraciones</strong> de la ficha del cliente.
          </p>
        </div>
      )}
    </div>
  )
}
