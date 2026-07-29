'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FolderInput } from 'lucide-react'

type CaseOption = { id: string; title: string; status: string }

const DOCUMENT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'evidence', label: 'Evidencia' },
  { value: 'correspondence', label: 'Correspondencia' },
  { value: 'contract', label: 'Contrato' },
  { value: 'brief', label: 'Escrito' },
  { value: 'court_filing', label: 'Presentación judicial' },
  { value: 'other', label: 'Otro' },
]

type Props = {
  attachmentId: string
  filename?: string
  clientId: string
  preselectedCaseId?: string | null
  trigger: ReactNode
  onSaved?: () => void
}

export function SaveToCaseDialog({ attachmentId, filename, clientId, preselectedCaseId, trigger, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [loadingCases, setLoadingCases] = useState(false)
  const [cases, setCases] = useState<CaseOption[]>([])
  const [caseId, setCaseId] = useState('')
  const [documentType, setDocumentType] = useState('evidence')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoadingCases(true)
    setError('')
    void fetch(`/api/cases?client_id=${clientId}`)
      .then((response) => response.json())
      .then((result) => {
        const list = ((result.cases ?? result ?? []) as CaseOption[]).filter(
          (item) => item.status !== 'closed' && item.status !== 'archived'
        )
        setCases(list)
        setCaseId((current) => current || (preselectedCaseId && list.some((item) => item.id === preselectedCaseId) ? preselectedCaseId : list[0]?.id ?? ''))
      })
      .catch(() => setError('No fue posible cargar los casos del cliente'))
      .finally(() => setLoadingCases(false))
  }, [open, clientId, preselectedCaseId])

  async function handleSave() {
    if (!caseId) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/inbox/attachments/${attachmentId}/save-to-case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, documentType, description: description.trim() || undefined }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'No fue posible guardar el documento')
      toast.success('Documento guardado en el caso')
      onSaved?.()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el documento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FolderInput className="h-4 w-4" />Guardar como documento del caso</DialogTitle>
        </DialogHeader>

        {loadingCases ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Cargando casos…</p>
        ) : cases.length === 0 ? (
          <div className="space-y-3 py-2 text-center">
            <p className="text-sm text-muted-foreground">Este cliente todavía no tiene casos activos.</p>
            <Button variant="outline" size="sm" asChild>
              <a href="/dashboard/cases/new" target="_blank" rel="noreferrer">Crear un caso</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filename ? <p className="truncate rounded-md border bg-muted/40 px-3 py-2 text-sm">{filename}</p> : null}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Caso</label>
              <select value={caseId} onChange={(event) => setCaseId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {cases.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Tipo de documento</label>
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {DOCUMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Descripción (opcional)</label>
              <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Notas para el expediente…" />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={() => void handleSave()} disabled={saving || !caseId}>{saving ? 'Guardando…' : 'Guardar'}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
