'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserCog } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { normalizeRole, ROLE_LABELS, type EffectiveRole } from '@/lib/authz'
import { useUser } from '@/components/providers/user-context'

type PlatformUser = {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
}

const ASSIGNABLE: EffectiveRole[] = ['admin', 'lawyer', 'assistant']

export function UsersAdminClient() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useUser()
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users')
      if (!response.ok) throw new Error('No fue posible cargar los usuarios')
      return response.json() as Promise<{ users: PlatformUser[] }>
    },
  })

  async function changeRole(userId: string, role: EffectiveRole) {
    setSavingId(userId)
    setMessage(null)
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const result = await response.json()
    setSavingId(null)
    if (!response.ok) {
      setMessage(result.error ?? 'No fue posible actualizar el rol')
      return
    }
    setMessage('Rol actualizado correctamente.')
    await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    if (userId === currentUser?.id) {
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] })
    }
  }

  const users = data?.users ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold"><UserCog className="h-8 w-8" />Usuarios</h1>
        <p className="mt-1 text-muted-foreground">Gestioná los roles del equipo. Solo administradores pueden cambiar roles.</p>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="p-3 font-medium">Nombre</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Rol</th>
                <th className="p-3 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody>
              {users.map(platformUser => {
                const effective = normalizeRole(platformUser.role)
                return (
                  <tr key={platformUser.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">
                      {platformUser.full_name || 'Sin nombre'}
                      {platformUser.id === currentUser?.id ? <Badge variant="secondary" className="ml-2">Vos</Badge> : null}
                    </td>
                    <td className="p-3 text-muted-foreground">{platformUser.email}</td>
                    <td className="p-3">
                      <select
                        value={effective ?? ''}
                        disabled={savingId === platformUser.id}
                        onChange={event => void changeRole(platformUser.id, event.target.value as EffectiveRole)}
                        className="h-9 rounded-md border bg-background px-2"
                      >
                        {effective === null ? <option value="">Sin acceso</option> : null}
                        {ASSIGNABLE.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                      </select>
                    </td>
                    <td className="p-3 text-muted-foreground">{new Date(platformUser.created_at).toLocaleDateString('es-UY')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  )
}
