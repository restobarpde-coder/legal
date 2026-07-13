'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type User = { id: string; full_name: string | null; email: string }
type Account = { id: string; email_address: string; display_name: string | null; account_type: string; user_id: string | null; last_sync_at: string | null; sync_enabled: boolean }

export function MessageSettings() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ account_type: 'personal', user_id: '', email_address: '', display_name: '', imap_host: 'imap.hostinger.com', imap_port: '993', smtp_host: 'smtp.hostinger.com', smtp_port: '465', username: '', password: '' })

  async function load() {
    const [accountResponse, userResponse] = await Promise.all([fetch('/api/inbox/email-accounts'), fetch('/api/inbox/users')])
    if (accountResponse.ok) setAccounts((await accountResponse.json()).accounts ?? [])
    if (userResponse.ok) setUsers((await userResponse.json()).users ?? [])
  }
  useEffect(() => { void load() }, [])

  async function createAccount(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('')
    const smtpPort = Number(form.smtp_port)
    const body = { ...form, user_id: form.account_type === 'personal' ? form.user_id : null, imap_port: Number(form.imap_port), smtp_port: smtpPort, imap_tls: true, smtp_tls: smtpPort === 465 }
    const response = await fetch('/api/inbox/email-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await response.json()
    setSaving(false)
    if (!response.ok) { setMessage(result.error ?? 'No fue posible guardar la cuenta'); return }
    setMessage('Cuenta configurada y cifrada correctamente.')
    setForm({ ...form, email_address: '', display_name: '', username: '', password: '' })
    await load()
  }

  async function sync(accountId?: string) {
    setMessage('Sincronizando…')
    const response = await fetch('/api/email/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(accountId ? { account_id: accountId } : {}) })
    const result = await response.json()
    const failed = (result.results ?? []).filter((item: { error?: string }) => item.error)
    setMessage(response.ok && failed.length === 0
      ? `Sincronización finalizada. Mensajes nuevos: ${(result.results ?? []).reduce((total: number, item: { created?: number }) => total + (item.created ?? 0), 0)}.`
      : failed.map((item: { error?: string }) => item.error).filter(Boolean).join(' · ') || result.error || 'No fue posible sincronizar')
    await load()
  }

  return <div className="mx-auto max-w-4xl space-y-8">
    <div className="flex items-start justify-between gap-4"><div><Link href="/dashboard/messages" className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" />Volver a Mensajes</Link><h1 className="text-3xl font-bold">Configuración de Mensajes</h1><p className="mt-1 text-muted-foreground">Solo administradores pueden gestionar las cuentas de correo y plantillas.</p></div><Button variant="outline" onClick={() => void sync()}><RefreshCw className="mr-2 h-4 w-4" />Sincronizar todo</Button></div>
    <section className="rounded-xl border p-5"><div className="mb-4 flex items-center gap-2"><Mail className="h-5 w-5" /><h2 className="font-semibold">Cuentas Hostinger</h2></div><div className="mb-5 space-y-2">{accounts.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay cuentas configuradas.</p> : accounts.map(account => <div key={account.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{account.display_name || account.email_address}</p><p className="text-xs text-muted-foreground">{account.account_type === 'personal' ? 'Personal' : 'Compartida'} · última sincronización: {account.last_sync_at ? new Date(account.last_sync_at).toLocaleString('es-UY') : 'nunca'}</p></div><Button size="sm" variant="outline" onClick={() => void sync(account.id)}>Sincronizar</Button></div>)}</div>
      <form onSubmit={createAccount} className="grid gap-3 border-t pt-5 md:grid-cols-2"><h3 className="md:col-span-2 font-medium">Agregar cuenta</h3><label className="text-sm">Tipo<select value={form.account_type} onChange={event => setForm({ ...form, account_type: event.target.value })} className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value="personal">Personal</option><option value="shared">Compartida</option></select></label>{form.account_type === 'personal' ? <label className="text-sm">Usuario de plataforma<select value={form.user_id} onChange={event => setForm({ ...form, user_id: event.target.value })} required className="mt-1 h-10 w-full rounded-md border bg-background px-3"><option value="">Seleccionar usuario</option>{users.map(user => <option key={user.id} value={user.id}>{user.full_name || user.email}</option>)}</select></label> : <div />}<Field label="Email" value={form.email_address} onChange={value => setForm({ ...form, email_address: value })} type="email" required /><Field label="Nombre visible" value={form.display_name} onChange={value => setForm({ ...form, display_name: value })} /><Field label="Servidor IMAP" value={form.imap_host} onChange={value => setForm({ ...form, imap_host: value })} required /><Field label="Puerto IMAP" value={form.imap_port} onChange={value => setForm({ ...form, imap_port: value })} required /><Field label="Servidor SMTP" value={form.smtp_host} onChange={value => setForm({ ...form, smtp_host: value })} required /><Field label="Puerto SMTP (465 recomendado; 587 usa STARTTLS)" value={form.smtp_port} onChange={value => setForm({ ...form, smtp_port: value })} required /><Field label="Usuario SMTP/IMAP" value={form.username} onChange={value => setForm({ ...form, username: value })} required /><Field label="Contraseña de Hostinger" value={form.password} onChange={value => setForm({ ...form, password: value })} type="password" required /><div className="md:col-span-2"><Button type="submit" disabled={saving}><Plus className="mr-2 h-4 w-4" />{saving ? 'Guardando…' : 'Guardar cuenta cifrada'}</Button></div></form></section>
    <section className="rounded-xl border p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" /><div><h2 className="font-semibold">Meta WhatsApp Cloud API</h2><p className="mt-1 text-sm text-muted-foreground">Cargá `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` y `WHATSAPP_APP_SECRET` en el entorno de producción. Luego configurá el webhook en Meta apuntando a `/api/webhooks/whatsapp`.</p></div></div></section>
    {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
  </div>
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="text-sm">{label}<Input className="mt-1" value={value} onChange={event => onChange(event.target.value)} type={type} required={required} /></label>
}
