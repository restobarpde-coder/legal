'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Mail, MessageCircle, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type InboxAccount = {
  id: string
  email_address: string
  display_name: string | null
  account_type: 'personal' | 'shared'
  sync_enabled?: boolean
}

type Template = { id: string; name: string; language_code: string }

type Props = {
  accounts: InboxAccount[]
  templates: Template[]
  loading: boolean
  onCancel: () => void
  onCreated: (id: string) => void
}

const initialForm = {
  contact_name: '', contact_phone: '', contact_email: '', template_id: '',
  email_account_id: '', subject: '', content: '',
}

export function InboxComposer({ accounts, templates, loading, onCancel, onCreated }: Props) {
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('email')
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (channel === 'email' && !form.email_account_id && accounts.length === 1) {
      setForm(current => ({ ...current, email_account_id: accounts[0].id }))
    }
  }, [accounts, channel, form.email_account_id])

  function update(key: keyof typeof initialForm, value: string) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/inbox/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, channel }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'No fue posible crear la conversación')
      onCreated(result.conversation_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la conversación')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Volver a la bandeja">
            <ArrowLeft />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Nueva conversación</h2>
            <p className="text-xs text-muted-foreground">Iniciá un contacto desde la bandeja del estudio</p>
          </div>
        </div>
        <Badge variant="secondary">Redacción</Badge>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-5">
        <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5 rounded-xl border bg-background p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            <button type="button" onClick={() => setChannel('email')} className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${channel === 'email' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}><Mail className="h-4 w-4" />Email</button>
            <button type="button" onClick={() => setChannel('whatsapp')} className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${channel === 'whatsapp' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}><MessageCircle className="h-4 w-4" />WhatsApp</button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input placeholder="Nombre del contacto" value={form.contact_name} onChange={event => update('contact_name', event.target.value)} />
            {channel === 'email'
              ? <Input type="email" placeholder="Email del destinatario" value={form.contact_email} onChange={event => update('contact_email', event.target.value)} required />
              : <Input placeholder="Número internacional, ej. +59899111222" value={form.contact_phone} onChange={event => update('contact_phone', event.target.value)} required />}
          </div>

          {channel === 'email' ? <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Enviar desde</label>
              <select value={form.email_account_id} onChange={event => update('email_account_id', event.target.value)} required disabled={loading || accounts.length === 0} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Seleccioná una casilla permitida</option>
                {accounts.map(account => <option key={account.id} value={account.id}>{account.display_name || account.email_address} · {account.account_type === 'shared' ? 'Compartida' : 'Personal'}</option>)}
              </select>
              {accounts.length === 0 && !loading ? <p className="mt-1.5 text-xs text-destructive">No tenés una casilla habilitada para enviar emails.</p> : null}
            </div>
            <Input placeholder="Asunto" value={form.subject} onChange={event => update('subject', event.target.value)} required />
          </> : <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Plantilla aprobada de Meta</label>
              <select value={form.template_id} onChange={event => update('template_id', event.target.value)} required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Seleccioná una plantilla</option>
                {templates.map(template => <option key={template.id} value={template.id}>{template.name} · {template.language_code}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">El primer contacto de WhatsApp debe usar una plantilla aprobada.</p>
            </div>
          </>}

          <Textarea placeholder={channel === 'email' ? 'Escribí el mensaje…' : 'Mensaje opcional para acompañar la plantilla…'} value={form.content} onChange={event => update('content', event.target.value)} required={channel === 'email'} className="min-h-40 resize-y" />
          {error ? <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving || loading || (channel === 'email' && accounts.length === 0)}><Send className="h-4 w-4" />{saving ? 'Enviando…' : channel === 'email' ? 'Enviar email' : 'Enviar plantilla'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
