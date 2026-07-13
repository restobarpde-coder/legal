'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'

type Account = { id: string; email_address: string; display_name: string | null }
type Template = { id: string; name: string; language_code: string }

export function NewConversationDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [form, setForm] = useState({ contact_name: '', contact_phone: '', contact_email: '', template_id: '', email_account_id: '', subject: '', content: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!open) return; void Promise.all([fetch('/api/inbox/email-accounts').then(r => r.json()), fetch('/api/inbox/templates').then(r => r.json())]).then(([a, t]) => { setAccounts(a.accounts ?? []); setTemplates(t.templates ?? []) }) }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    const response = await fetch('/api/inbox/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, channel }) })
    const result = await response.json(); setSaving(false)
    if (!response.ok) { setError(result.error ?? 'No fue posible crear la conversación'); return }
    setOpen(false); setForm({ contact_name: '', contact_phone: '', contact_email: '', template_id: '', email_account_id: '', subject: '', content: '' }); onCreated(result.conversation_id)
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nueva conversación</Button></DialogTrigger><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Nueva conversación</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-3"><select value={channel} onChange={event => setChannel(event.target.value as typeof channel)} className="h-10 w-full rounded-md border bg-background px-3"><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select><Input placeholder="Nombre del contacto" value={form.contact_name} onChange={event => setForm({ ...form, contact_name: event.target.value })} />{channel === 'whatsapp' ? <><Input placeholder="Número internacional, ej. +59899111222" value={form.contact_phone} onChange={event => setForm({ ...form, contact_phone: event.target.value })} required /><select value={form.template_id} onChange={event => setForm({ ...form, template_id: event.target.value })} required className="h-10 w-full rounded-md border bg-background px-3"><option value="">Plantilla aprobada de Meta</option>{templates.map(template => <option key={template.id} value={template.id}>{template.name} ({template.language_code})</option>)}</select><p className="text-xs text-muted-foreground">El primer contacto se envía como plantilla aprobada por Meta.</p></> : <><Input type="email" placeholder="Email del destinatario" value={form.contact_email} onChange={event => setForm({ ...form, contact_email: event.target.value })} required /><select value={form.email_account_id} onChange={event => setForm({ ...form, email_account_id: event.target.value })} required className="h-10 w-full rounded-md border bg-background px-3"><option value="">Cuenta remitente</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.display_name || account.email_address}</option>)}</select><Input placeholder="Asunto" value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} required /><Textarea placeholder="Mensaje" value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} required /></>} {error ? <p className="text-sm text-destructive">{error}</p> : null}<Button type="submit" className="w-full" disabled={saving}>{saving ? 'Creando…' : channel === 'whatsapp' ? 'Enviar plantilla' : 'Enviar email'}</Button></form></DialogContent></Dialog>
}
