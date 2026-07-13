'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mail, MessageCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { normalizePhoneUY } from '@/lib/phone'

export type InboxAccount = {
  id: string
  email_address: string
  display_name: string | null
  account_type: 'personal' | 'shared'
  sync_enabled?: boolean
}

export type InboxTemplate = { id: string; name: string; language_code: string }

export type ConversationFormDefaults = {
  channel?: 'whatsapp' | 'email'
  contact_name?: string
  contact_email?: string
  contact_phone?: string
}

type Props = {
  defaults?: ConversationFormDefaults
  linkedClientId?: string
  linkedCaseId?: string
  onCreated: (conversationId: string) => void
  onCancel: () => void
  /** Pass pre-fetched data to skip internal fetching (used by the inbox page). */
  accounts?: InboxAccount[]
  templates?: InboxTemplate[]
  loading?: boolean
}

const emptyForm = {
  contact_name: '', contact_phone: '', contact_email: '', template_id: '',
  email_account_id: '', subject: '', content: '',
}

export function ConversationForm({ defaults, linkedClientId, linkedCaseId, onCreated, onCancel, accounts: accountsProp, templates: templatesProp, loading: loadingProp }: Props) {
  const [channel, setChannel] = useState<'whatsapp' | 'email'>(defaults?.channel ?? 'email')
  const [form, setForm] = useState({
    ...emptyForm,
    contact_name: defaults?.contact_name ?? '',
    contact_email: defaults?.contact_email ?? '',
    contact_phone: defaults?.contact_phone ? (normalizePhoneUY(defaults.contact_phone)?.e164 ?? defaults.contact_phone) : '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const selfContained = accountsProp === undefined

  const { data: fetchedData, isLoading: fetching } = useQuery({
    queryKey: ['inbox-compose-data'],
    enabled: selfContained,
    queryFn: async () => {
      const [accountsResponse, templatesResponse] = await Promise.all([
        fetch('/api/inbox/email-accounts'),
        fetch('/api/inbox/templates'),
      ])
      const accountsJson = accountsResponse.ok ? await accountsResponse.json() : { accounts: [] }
      const templatesJson = templatesResponse.ok ? await templatesResponse.json() : { templates: [] }
      return {
        accounts: (accountsJson.accounts ?? []) as InboxAccount[],
        templates: (templatesJson.templates ?? []) as InboxTemplate[],
      }
    },
  })

  const accounts = accountsProp ?? fetchedData?.accounts ?? []
  const templates = templatesProp ?? fetchedData?.templates ?? []
  const loading = loadingProp ?? (selfContained && fetching)

  useEffect(() => {
    if (channel === 'email' && !form.email_account_id && accounts.length === 1) {
      setForm(current => ({ ...current, email_account_id: accounts[0].id }))
    }
  }, [accounts, channel, form.email_account_id])

  function update(key: keyof typeof emptyForm, value: string) {
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
        body: JSON.stringify({
          ...form,
          channel,
          linked_client_id: linkedClientId ?? null,
          linked_case_id: linkedCaseId ?? null,
        }),
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
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        <button type="button" onClick={() => setChannel('email')} className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${channel === 'email' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}><Mail className="h-4 w-4" />Email</button>
        <button type="button" onClick={() => setChannel('whatsapp')} className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${channel === 'whatsapp' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}><MessageCircle className="h-4 w-4" />WhatsApp</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input placeholder="Nombre del contacto" value={form.contact_name} onChange={event => update('contact_name', event.target.value)} />
        {channel === 'email'
          ? <Input type="email" placeholder="Email del destinatario" value={form.contact_email} onChange={event => update('contact_email', event.target.value)} required />
          : <Input placeholder="Número, ej. +59899111222 o 099111222" value={form.contact_phone} onChange={event => update('contact_phone', event.target.value)} required />}
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
  )
}
