'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Link2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

type ClientOption = { id: string; name: string; company?: string | null; email?: string | null }
type CaseOption = { id: string; title: string; status: string }

type Props = {
  conversationId: string
  currentClient?: { id: string; name: string } | null
  trigger: ReactNode
  onLinked: () => void
}

// Links an inbox conversation to a platform client (and optionally one of the
// client's cases) via PATCH /api/inbox/conversations/[id].
export function LinkClientDialog({ conversationId, currentClient, trigger, onLinked }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const [cases, setCases] = useState<CaseOption[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      const response = await fetch(`/api/clients?${params.toString()}`)
      if (response.ok) {
        const result = await response.json()
        setClients((result.clients ?? result ?? []).slice(0, 8))
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [open, search])

  useEffect(() => {
    if (!selectedClient) { setCases([]); setSelectedCaseId(''); return }
    void (async () => {
      const response = await fetch(`/api/cases?client_id=${selectedClient.id}`)
      if (response.ok) {
        const result = await response.json()
        const list = (result.cases ?? result ?? []) as CaseOption[]
        setCases(list.filter(caseItem => caseItem.status !== 'closed' && caseItem.status !== 'archived'))
      } else {
        setCases([])
      }
    })()
  }, [selectedClient])

  async function save(unlink = false) {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/inbox/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unlink
          ? { linked_client_id: null, linked_case_id: null }
          : { linked_client_id: selectedClient!.id, linked_case_id: selectedCaseId || null }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'No fue posible actualizar la vinculación')
      setOpen(false)
      setSelectedClient(null)
      setSearch('')
      onLinked()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar la vinculación')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-4 w-4" />Vincular a cliente</DialogTitle>
        </DialogHeader>

        {!selectedClient ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar cliente por nombre, email o empresa…"
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {clients.map(client => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClient(client)}
                  className="w-full rounded-md border p-2.5 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">{client.name}</span>
                  {client.company ? <span className="text-muted-foreground"> · {client.company}</span> : null}
                  {client.email ? <p className="truncate text-xs text-muted-foreground">{client.email}</p> : null}
                </button>
              ))}
              {clients.length === 0 ? <p className="p-2 text-sm text-muted-foreground">Sin resultados.</p> : null}
            </div>
            {currentClient ? (
              <Button variant="outline" size="sm" className="w-full" disabled={saving} onClick={() => void save(true)}>
                <X className="mr-1 h-4 w-4" />Quitar vinculación con {currentClient.name}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">{selectedClient.name}</p>
              {selectedClient.email ? <p className="text-xs text-muted-foreground">{selectedClient.email}</p> : null}
              <button type="button" className="mt-1 text-xs text-primary underline-offset-2 hover:underline" onClick={() => setSelectedClient(null)}>
                Elegir otro cliente
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Caso (opcional)</label>
              <select value={selectedCaseId} onChange={event => setSelectedCaseId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Sin caso específico</option>
                {cases.map(caseItem => <option key={caseItem.id} value={caseItem.id}>{caseItem.title}</option>)}
              </select>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={() => void save()} disabled={saving}>{saving ? 'Guardando…' : 'Vincular'}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
