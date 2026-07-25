import { requireAuth } from '@/lib/auth'
import { NotificationPreferencesPanel } from '@/components/settings/notification-preferences-panel'

export const metadata = {
  title: 'Configuración',
}

export default async function SettingsPage() {
  await requireAuth()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Elegí qué te avisa la plataforma y por dónde.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Notificaciones</h2>
        <NotificationPreferencesPanel />
      </section>
    </div>
  )
}
