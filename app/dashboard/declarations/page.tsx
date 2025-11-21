import { requireAuth } from "@/lib/auth"
import { AudioRecorder } from "@/components/audio-recorder"
import { getCasesForSelection, getClientsForSelection } from './actions'

export default async function DeclarationsPage() {
  await requireAuth()

  const cases = await getCasesForSelection()
  const clients = await getClientsForSelection()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Declaraciones</h1>
        <p className="text-muted-foreground">
          Graba y procesa declaraciones de clientes
        </p>
      </div>

      <AudioRecorder cases={cases} clients={clients} />

      {/* Future enhancement: Display history of declarations */}
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Historial de declaraciones próximamente
        </p>
      </div>
    </div>
  )
}
