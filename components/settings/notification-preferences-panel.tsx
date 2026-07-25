'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bell, BellRing, Loader2, Smartphone } from 'lucide-react'
import {
  NOTIFICATION_GROUPS,
  NOTIFICATION_PREFERENCES_CHANGED_EVENT,
  NOTIFICATION_TYPES,
  defaultPreferences,
  type NotificationPreference,
  type NotificationTypeId,
} from '@/lib/notifications/catalog'

type PreferenceMap = Record<NotificationTypeId, { enabled: boolean; push: boolean }>

function toMap(preferences: NotificationPreference[]): PreferenceMap {
  return preferences.reduce((map, preference) => {
    map[preference.type] = { enabled: preference.enabled, push: preference.push }
    return map
  }, {} as PreferenceMap)
}

function toList(map: PreferenceMap): NotificationPreference[] {
  return NOTIFICATION_TYPES.map(type => ({
    type: type.id,
    enabled: map[type.id]?.enabled ?? type.defaultEnabled,
    push: map[type.id]?.push ?? type.defaultPush,
  }))
}

type PushPermission = 'unsupported' | NotificationPermission

function usePushPermission() {
  const [permission, setPermission] = useState<PushPermission>('unsupported')

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    setPermission(Notification.permission)
  }, [])

  const request = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') toast.success('Avisos del dispositivo activados')
    if (result === 'denied') toast.error('El navegador bloqueó los avisos del dispositivo')
  }, [])

  return { permission, request }
}

export function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState<PreferenceMap>(() => toMap(defaultPreferences()))
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { permission, request: requestPermission } = usePushPermission()

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const response = await fetch('/api/notifications/preferences', { cache: 'no-store' })
        if (!response.ok) throw new Error('No fue posible cargar tus preferencias')
        const result = await response.json() as { preferences: NotificationPreference[] }
        if (!active) return
        setPreferences(toMap(result.preferences))
        setLoadError(null)
      } catch (error) {
        if (!active) return
        setLoadError((error as Error).message)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [])

  // Guardado optimista: la UI ya movió el switch, así que ante un error se
  // revierte al estado previo en lugar de dejar la pantalla mintiendo.
  const persist = useCallback(async (next: PreferenceMap, previous: PreferenceMap) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: toList(next) }),
      })
      if (!response.ok) throw new Error('No fue posible guardar el cambio')
      const result = await response.json() as { preferences: NotificationPreference[] }
      setPreferences(toMap(result.preferences))
      // El provider de la campana relee los flags de push sin esperar refresh.
      window.dispatchEvent(new Event(NOTIFICATION_PREFERENCES_CHANGED_EVENT))
    } catch (error) {
      setPreferences(previous)
      toast.error((error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }, [])

  const updateTypes = useCallback((
    types: NotificationTypeId[],
    patch: Partial<{ enabled: boolean; push: boolean }>,
  ) => {
    setPreferences(current => {
      const next = { ...current }
      for (const type of types) {
        next[type] = { ...current[type], ...patch }
      }
      void persist(next, current)
      return next
    })
  }, [persist])

  const typesByGroup = useMemo(() => {
    return NOTIFICATION_GROUPS.map(group => ({
      group,
      types: NOTIFICATION_TYPES.filter(type => type.group === group.id),
    }))
  }, [])

  const activeCount = NOTIFICATION_TYPES.filter(type => preferences[type.id]?.enabled).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2 text-sm">Cargando preferencias...</span>
      </div>
    )
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4 shrink-0" />
            Avisos en este dispositivo
          </CardTitle>
          <CardDescription>
            Los avisos del sistema aparecen cuando la app está en segundo plano. Sin este permiso
            las notificaciones solo se ven en la campana.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permission === 'granted' ? (
            <p className="text-sm text-muted-foreground">
              Permiso concedido. Podés elegir abajo qué avisos suenan en el dispositivo.
            </p>
          ) : permission === 'denied' ? (
            <p className="text-sm text-muted-foreground">
              El navegador tiene los avisos bloqueados para este sitio. Habilitalos desde los
              ajustes del navegador para volver a recibirlos.
            </p>
          ) : permission === 'unsupported' ? (
            <p className="text-sm text-muted-foreground">
              Este navegador no admite avisos del sistema.
            </p>
          ) : (
            <Button onClick={() => void requestPermission()} className="w-full sm:w-auto">
              <BellRing className="h-4 w-4 mr-2" />
              Activar avisos del dispositivo
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-sm text-muted-foreground">
          {activeCount} de {NOTIFICATION_TYPES.length} tipos activos
        </p>
        {isSaving && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Guardando
          </span>
        )}
      </div>

      {typesByGroup.map(({ group, types }) => {
        const typeIds = types.map(type => type.id)
        const allEnabled = typeIds.every(id => preferences[id]?.enabled)

        return (
          <Card key={group.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-base">{group.label}</CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </div>
                <Switch
                  checked={allEnabled}
                  onCheckedChange={checked => updateTypes(typeIds, { enabled: checked })}
                  aria-label={`Activar todo en ${group.label}`}
                  className="mt-1 shrink-0"
                />
              </div>
            </CardHeader>
            <CardContent className="divide-y">
              {types.map(type => {
                const preference = preferences[type.id]
                const pushDisabled = !preference?.enabled || permission !== 'granted'

                return (
                  <div key={type.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                      </div>
                      <Switch
                        checked={preference?.enabled ?? true}
                        onCheckedChange={checked => updateTypes([type.id], { enabled: checked })}
                        aria-label={type.label}
                        className="mt-0.5 shrink-0"
                      />
                    </div>

                    <label
                      className={`mt-3 flex items-center gap-2 text-xs ${
                        pushDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground cursor-pointer'
                      }`}
                    >
                      <Switch
                        checked={(preference?.push ?? true) && !pushDisabled}
                        disabled={pushDisabled}
                        onCheckedChange={checked => updateTypes([type.id], { push: checked })}
                        aria-label={`Aviso en el dispositivo para ${type.label}`}
                        className="scale-90 origin-left"
                      />
                      <Bell className="h-3 w-3" />
                      Aviso en el dispositivo
                    </label>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
