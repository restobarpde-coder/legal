import { requireAuth } from "@/lib/auth"
import { AudioRecorder } from "@/components/audio-recorder"

export default async function DeclarationsPage() {
  await requireAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Declaraciones</h1>
        <p className="text-muted-foreground">
          Graba y procesa declaraciones de clientes
        </p>
      </div>

      <AudioRecorder />

      {/* Future enhancement: Display history of declarations */}
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Historial de declaraciones próximamente
        </p>
      </div>
    </div>
  )
}
