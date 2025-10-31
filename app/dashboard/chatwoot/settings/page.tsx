'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, Check, X, AlertCircle, Users } from 'lucide-react'
import { toast } from 'sonner'

interface UserSyncStatus {
  id: string
  email: string
  full_name: string
  role: string
  is_synced: boolean
  chatwoot_agent_name?: string
  sync_enabled: boolean
}

export default function ChatwootSettingsPage() {
  const [users, setUsers] = useState<UserSyncStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    synced: 0,
    unsynced: 0
  })

  const fetchSyncStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/chatwoot/agents/sync')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        setStats({
          total: data.total_users,
          synced: data.synced_users,
          unsynced: data.unsynced_users
        })
      } else {
        toast.error('Error cargando estado de sincronización')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const syncAgents = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/chatwoot/agents/sync', {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        toast.success('Sincronización completada', {
          description: `${data.results.updated} usuarios actualizados`
        })
        
        if (data.results.errors.length > 0) {
          console.warn('Errores durante sincronización:', data.results.errors)
        }
        
        // Recargar estado
        fetchSyncStatus()
      } else {
        const error = await response.json()
        toast.error('Error en sincronización', {
          description: error.error
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchSyncStatus()
  }, [])

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configuración de Chatwoot</h1>
        <p className="text-muted-foreground mt-2">
          Sincroniza los agentes de Chatwoot con los usuarios de la aplicación
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sincronizados</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.synced}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Sincronizar</CardTitle>
            <X className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unsynced}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alert explicativo */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          La sincronización vincula automáticamente los agentes de Chatwoot con los usuarios de la app usando el email.
          Los usuarios sincronizados solo verán las conversaciones asignadas a ellos en Chatwoot.
        </AlertDescription>
      </Alert>

      {/* Panel de sincronización */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Agentes y Usuarios</CardTitle>
              <CardDescription>
                Estado de sincronización de usuarios con Chatwoot
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSyncStatus}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button
                size="sm"
                onClick={syncAgents}
                disabled={syncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sincronizar Agentes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Cargando usuarios...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay usuarios</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{user.full_name}</p>
                      <Badge variant="outline">{user.role}</Badge>
                      {user.is_synced && (
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Sincronizado
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.chatwoot_agent_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Chatwoot: {user.chatwoot_agent_name}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    {user.is_synced ? (
                      <Badge variant="outline" className="text-green-600">
                        {user.sync_enabled ? 'Filtro activo' : 'Filtro desactivado'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600">
                        Sin vincular
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card>
        <CardHeader>
          <CardTitle>Cómo funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>1. Crear usuarios en la app</strong>
            <p className="text-muted-foreground">
              Primero, asegúrate de que los usuarios estén registrados en Legal Studio con el mismo email que usan en Chatwoot.
            </p>
          </div>
          <div>
            <strong>2. Sincronizar agentes</strong>
            <p className="text-muted-foreground">
              Haz clic en "Sincronizar Agentes" para vincular automáticamente los agentes de Chatwoot con los usuarios de la app por email.
            </p>
          </div>
          <div>
            <strong>3. Filtro automático</strong>
            <p className="text-muted-foreground">
              Una vez sincronizados, cada usuario verá solo las conversaciones que Chatwoot le ha asignado. Los administradores ven todas las conversaciones.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
