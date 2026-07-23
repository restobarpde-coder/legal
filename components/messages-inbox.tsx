'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  CheckCheck,
  FileText,
  Info,
  Mail,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Send,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { InboxComposer, type InboxAccount } from '@/components/inbox-composer'
import { LinkClientDialog } from '@/components/inbox/link-client-dialog'
import { createClient } from '@/lib/supabase/client'

type Channel = 'all' | 'whatsapp' | 'email'
type Status = 'open' | 'pending' | 'resolved' | 'spam' | 'all'

type Conversation = {
  id: string
  channel: 'whatsapp' | 'email'
  status: Exclude<Status, 'all'>
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  email_subject: string | null
  unread_count: number
  last_message_at: string | null
  last_message_preview: string | null
  linked_client_id: string | null
  linked_client?: { id: string; name: string } | null
  assigned_user?: { id: string; full_name: string | null; email: string } | null
  email_account?: { id: string; email_address: string; display_name?: string | null; account_type: 'personal' | 'shared' } | null
}

type Message = {
  id: string
  conversation_id?: string
  direction: 'inbound' | 'outbound'
  content: string | null
  content_type: 'text' | 'image' | 'document' | 'audio' | 'video'
  sender_name: string | null
  email_account_id?: string | null
  email_from?: string | null
  email_account?: { id: string; email_address: string; display_name?: string | null; account_type: 'personal' | 'shared' } | null
  wa_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | null
  attachments: Array<{ attachmentId?: string; filename?: string; type?: string; mimeType?: string; size?: number }> | null
  sent_at: string | null
  created_at: string
}

type LoadOptions = {
  background?: boolean
}

function sortConversations(items: Conversation[]) {
  return [...items].sort((left, right) => {
    const leftTime = left.last_message_at ? new Date(left.last_message_at).getTime() : 0
    const rightTime = right.last_message_at ? new Date(right.last_message_at).getTime() : 0
    return rightTime - leftTime
  })
}

function sortMessages(items: Message[]) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.sent_at ?? left.created_at).getTime()
    const rightTime = new Date(right.sent_at ?? right.created_at).getTime()
    return leftTime - rightTime
  })
}

function upsertMessage(items: Message[], incoming: Message) {
  const existing = items.find(item => item.id === incoming.id)
  const merged = existing ? { ...existing, ...incoming } : incoming
  return sortMessages([
    ...items.filter(item => item.id !== incoming.id),
    merged,
  ])
}

function formatDate(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('es-UY', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(value))
}

function formatListDate(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat('es-UY', { hour: '2-digit', minute: '2-digit' }).format(date)
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  return new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: 'short' }).format(date)
}

function channelLabel(channel: Conversation['channel']) {
  return channel === 'whatsapp' ? 'WhatsApp' : 'Email'
}

export function MessagesInbox() {
  const supabase = useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const notificationConversationId = searchParams.get('conversation')
  const [channel, setChannel] = useState<Channel>('all')
  const [status, setStatus] = useState<Status>('open')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesConversationId, setMessagesConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  // Master-detail en móvil: se muestra la lista o el chat, nunca ambos.
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list')
  const isMobile = useIsMobile()
  const [accounts, setAccounts] = useState<InboxAccount[]>([])
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; language_code: string }>>([])
  const [composeLoading, setComposeLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastScrolledConversationRef = useRef<string | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const messagesConversationIdRef = useRef<string | null>(null)
  const conversationsRequestRef = useRef(0)
  const messagesRequestRef = useRef(0)
  const conversationsAbortRef = useRef<AbortController | null>(null)
  const messagesAbortRef = useRef<AbortController | null>(null)
  const listReconciliationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const detailReconciliationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readRequestsRef = useRef(new Set<string>())
  const pendingReadRequestsRef = useRef(new Set<string>())
  const handledNotificationRef = useRef<string | null>(null)
  const loadConversationsRef = useRef<(preferredId?: string, options?: LoadOptions) => Promise<void>>(async () => {})
  const loadMessagesRef = useRef<(conversationId: string, options?: LoadOptions) => Promise<void>>(async () => {})

  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])
  useEffect(() => { messagesConversationIdRef.current = messagesConversationId }, [messagesConversationId])

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId]
  )
  const visibleMessages = messagesConversationId === selectedId ? messages : []

  const shouldKeepConversationRead = useCallback((conversationId: string) => {
    return document.visibilityState === 'visible' && conversationId === selectedIdRef.current
  }, [])

  const normalizeConversationReadState = useCallback((conversation: Conversation) => {
    return shouldKeepConversationRead(conversation.id) && conversation.unread_count > 0
      ? { ...conversation, unread_count: 0 }
      : conversation
  }, [shouldKeepConversationRead])

  const loadConversations = useCallback(async (preferredId?: string, options: LoadOptions = {}) => {
    conversationsAbortRef.current?.abort()
    const controller = new AbortController()
    conversationsAbortRef.current = controller
    const requestId = ++conversationsRequestRef.current
    if (!options.background) {
      setLoading(true)
      setError(null)
    }
    try {
      const response = await fetch(`/api/inbox/conversations?channel=${channel}&status=${status}&assigned=all`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'No fue posible cargar las conversaciones')
      if (requestId !== conversationsRequestRef.current) return
      const nextConversations = sortConversations(
        (result.conversations ?? []).map((conversation: Conversation) => normalizeConversationReadState(conversation))
      )
      setConversations(nextConversations)
      setSelectedId((current) => {
        const nextSelectedId = preferredId && nextConversations.some((item: Conversation) => item.id === preferredId)
          ? preferredId
          : current && nextConversations.some((item: Conversation) => item.id === current)
            ? current
            : nextConversations[0]?.id ?? null
        selectedIdRef.current = nextSelectedId
        return nextSelectedId
      })
    } catch (err) {
      if (requestId !== conversationsRequestRef.current) return
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (!options.background) {
        setError(err instanceof Error ? err.message : 'No fue posible cargar las conversaciones')
      }
    } finally {
      if (requestId === conversationsRequestRef.current) {
        if (conversationsAbortRef.current === controller) conversationsAbortRef.current = null
        setLoading(false)
      }
    }
  }, [channel, normalizeConversationReadState, status])

  const loadMessages = useCallback(async (conversationId: string, options: LoadOptions = {}) => {
    messagesAbortRef.current?.abort()
    const controller = new AbortController()
    messagesAbortRef.current = controller
    const requestId = ++messagesRequestRef.current
    if (!options.background) {
      setMessages([])
      setMessagesConversationId(null)
      messagesConversationIdRef.current = null
      setDetailLoading(true)
    }
    try {
      const response = await fetch(`/api/inbox/conversations/${conversationId}/messages`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'No fue posible cargar los mensajes')
      if (requestId !== messagesRequestRef.current || selectedIdRef.current !== conversationId) return
      const snapshot = sortMessages(result.messages ?? [])
      setMessages(snapshot)
      setMessagesConversationId(conversationId)
      messagesConversationIdRef.current = conversationId
    } catch (err) {
      if (requestId !== messagesRequestRef.current) return
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (!options.background) {
        setError(err instanceof Error ? err.message : 'No fue posible cargar los mensajes')
        if (selectedIdRef.current === conversationId) {
          setMessages([])
          setMessagesConversationId(null)
          messagesConversationIdRef.current = null
        }
      }
    } finally {
      if (requestId === messagesRequestRef.current) {
        if (messagesAbortRef.current === controller) messagesAbortRef.current = null
        if (selectedIdRef.current === conversationId) setDetailLoading(false)
      }
    }
  }, [])

  useEffect(() => { loadConversationsRef.current = loadConversations }, [loadConversations])
  useEffect(() => { loadMessagesRef.current = loadMessages }, [loadMessages])

  useEffect(() => { void loadConversations() }, [loadConversations])
  useEffect(() => {
    selectedIdRef.current = selectedId
    if (selectedId) {
      void loadMessages(selectedId)
      return
    }
    messagesAbortRef.current?.abort()
    messagesAbortRef.current = null
    messagesRequestRef.current++
    setMessages([])
    setMessagesConversationId(null)
    messagesConversationIdRef.current = null
    setDetailLoading(false)
  }, [selectedId, loadMessages])

  const scheduleListReconciliation = useCallback((delay = 150) => {
    if (listReconciliationTimerRef.current) clearTimeout(listReconciliationTimerRef.current)
    listReconciliationTimerRef.current = setTimeout(() => {
      listReconciliationTimerRef.current = null
      void loadConversationsRef.current(undefined, { background: true })
    }, delay)
  }, [])

  const scheduleDetailReconciliation = useCallback((delay = 150) => {
    if (detailReconciliationTimerRef.current) clearTimeout(detailReconciliationTimerRef.current)
    detailReconciliationTimerRef.current = setTimeout(() => {
      detailReconciliationTimerRef.current = null
      const conversationId = selectedIdRef.current
      if (conversationId) void loadMessagesRef.current(conversationId, { background: true })
    }, delay)
  }, [])

  const markConversationRead = useCallback(async function confirmConversationRead(conversationId: string) {
    setConversations(current => current.map(conversation => conversation.id === conversationId
      ? { ...conversation, unread_count: 0 }
      : conversation))
    if (readRequestsRef.current.has(conversationId)) {
      pendingReadRequestsRef.current.add(conversationId)
      return
    }
    readRequestsRef.current.add(conversationId)
    try {
      const response = await fetch(`/api/inbox/conversations/${conversationId}/read`, { method: 'POST' })
      if (!response.ok) void loadConversationsRef.current(conversationId, { background: true })
    } catch {
      void loadConversationsRef.current(conversationId, { background: true })
    } finally {
      readRequestsRef.current.delete(conversationId)
      if (pendingReadRequestsRef.current.delete(conversationId)) {
        void confirmConversationRead(conversationId)
      }
    }
  }, [])

  const selectConversation = useCallback((conversationId: string) => {
    setMobilePane('chat')
    if (conversationId === selectedIdRef.current) {
      void markConversationRead(conversationId)
      return
    }
    messagesAbortRef.current?.abort()
    messagesRequestRef.current++
    selectedIdRef.current = conversationId
    messagesConversationIdRef.current = null
    setMessages([])
    setMessagesConversationId(null)
    setDetailLoading(true)
    setSelectedId(conversationId)
    if (document.visibilityState === 'visible') void markConversationRead(conversationId)
  }, [markConversationRead])

  useEffect(() => {
    if (!notificationConversationId) {
      handledNotificationRef.current = null
      return
    }
    if (!conversations.some(conversation => conversation.id === notificationConversationId) && status !== 'all') {
      setStatus('all')
      return
    }
    if (notificationConversationId
      && notificationConversationId !== handledNotificationRef.current
      && conversations.some(conversation => conversation.id === notificationConversationId)) {
      handledNotificationRef.current = notificationConversationId
      selectConversation(notificationConversationId)
    }
  }, [conversations, notificationConversationId, selectConversation, status])

  useEffect(() => {
    if (selectedId && document.visibilityState === 'visible') void markConversationRead(selectedId)
  }, [markConversationRead, selectedId])

  const dismissConversationNotifications = useCallback((conversationId: string) => {
    void fetch('/api/notifications/entity/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: 'inbox_conversation', entity_id: conversationId }),
    })
  }, [])

  useEffect(() => {
    if (selectedId && document.visibilityState === 'visible') {
      dismissConversationNotifications(selectedId)
    }
  }, [dismissConversationNotifications, selectedId])

  useEffect(() => {
    if (!isComposing) return
    setComposeLoading(true)
    void Promise.all([
      fetch('/api/inbox/email-accounts').then(response => response.json()),
      fetch('/api/inbox/templates').then(response => response.json()),
    ]).then(([accountResult, templateResult]) => {
      setAccounts(accountResult.accounts ?? [])
      setTemplates(templateResult.templates ?? [])
    }).catch(() => setError('No fue posible cargar las opciones de redacción'))
      .finally(() => setComposeLoading(false))
  }, [isComposing])

  useEffect(() => {
    let active = true
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_messages' }, (payload) => {
        if (!active) return
        const message = payload.new as Message
        if (!message.conversation_id) return

        if (payload.eventType === 'INSERT') {
          scheduleListReconciliation(0)
        }

        if (message.conversation_id === selectedIdRef.current) {
          scheduleDetailReconciliation(0)
          if (payload.eventType === 'INSERT'
            && message.direction === 'inbound'
            && document.visibilityState === 'visible'
          ) {
            void markConversationRead(message.conversation_id)
            window.setTimeout(() => {
              if (active) dismissConversationNotifications(message.conversation_id!)
            }, 500)
          }
        }
      })

    void (async () => {
      await supabase.realtime.setAuth()
      if (!active) return
      channel.subscribe((subscriptionStatus) => {
        if (!active) return
        if (subscriptionStatus === 'SUBSCRIBED') {
          setRealtimeConnected(true)
          scheduleListReconciliation(0)
          scheduleDetailReconciliation(0)
          return
        }
        if (subscriptionStatus === 'CLOSED'
          || subscriptionStatus === 'CHANNEL_ERROR'
          || subscriptionStatus === 'TIMED_OUT'
        ) {
          setRealtimeConnected(false)
        }
      })
    })()

    return () => {
      active = false
      setRealtimeConnected(false)
      void supabase.removeChannel(channel)
    }
  }, [dismissConversationNotifications, markConversationRead, scheduleDetailReconciliation, scheduleListReconciliation, supabase])

  useEffect(() => {
    const reconcileVisibleTab = () => {
      if (document.visibilityState !== 'visible') return
      scheduleListReconciliation(0)
      scheduleDetailReconciliation(0)
      const conversationId = selectedIdRef.current
      if (conversationId) {
        void markConversationRead(conversationId)
        dismissConversationNotifications(conversationId)
      }
    }
    const reconcileOnline = () => {
      scheduleListReconciliation(0)
      scheduleDetailReconciliation(0)
    }

    document.addEventListener('visibilitychange', reconcileVisibleTab)
    window.addEventListener('online', reconcileOnline)
    return () => {
      document.removeEventListener('visibilitychange', reconcileVisibleTab)
      window.removeEventListener('online', reconcileOnline)
    }
  }, [dismissConversationNotifications, markConversationRead, scheduleDetailReconciliation, scheduleListReconciliation])

  useEffect(() => {
    if (realtimeConnected) return
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      scheduleListReconciliation(0)
      scheduleDetailReconciliation(0)
    }, 5_000)

    return () => window.clearInterval(interval)
  }, [realtimeConnected, scheduleDetailReconciliation, scheduleListReconciliation])

  useEffect(() => {
    if (!visibleMessages.length) return
    const isNewConversation = lastScrolledConversationRef.current !== messagesConversationId
    lastScrolledConversationRef.current = messagesConversationId
    messagesEndRef.current?.scrollIntoView({ behavior: isNewConversation ? 'auto' : 'smooth', block: 'end' })
  }, [visibleMessages, messagesConversationId])

  useEffect(() => () => {
    conversationsAbortRef.current?.abort()
    messagesAbortRef.current?.abort()
    if (listReconciliationTimerRef.current) clearTimeout(listReconciliationTimerRef.current)
    if (detailReconciliationTimerRef.current) clearTimeout(detailReconciliationTimerRef.current)
  }, [])

  async function sendReply() {
    if (!selectedId || (!draft.trim() && files.length === 0)) return
    const conversationId = selectedId
    const replyContent = draft.trim()
    const replyFiles = [...files]
    setSending(true)
    setError(null)
    try {
      const uploadedFiles = await Promise.all(replyFiles.map(async file => {
        const uploadUrlResponse = await fetch(`/api/inbox/conversations/${conversationId}/attachments/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, mimeType: file.type, size: file.size }),
        })
        const uploadUrl = await uploadUrlResponse.json()
        if (!uploadUrlResponse.ok) throw new Error(uploadUrl.error ?? `No se pudo preparar ${file.name}`)

        const { error: uploadError } = await supabase.storage
          .from('inbox-attachments')
          .uploadToSignedUrl(uploadUrl.path, uploadUrl.token, file, { contentType: file.type || 'application/octet-stream' })
        if (uploadError) throw new Error(`No se pudo subir ${file.name}: ${uploadError.message}`)
        return { path: uploadUrl.path, filename: file.name, mimeType: file.type || 'application/octet-stream', size: file.size }
      }))

      const response = await fetch(`/api/inbox/conversations/${conversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent, attachments: uploadedFiles }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (result.message_id && selectedIdRef.current === conversationId) {
          await loadMessages(conversationId, { background: true })
        }
        throw new Error(result.error ?? 'No fue posible enviar el mensaje')
      }
      if (selectedIdRef.current === conversationId) {
        if (result.message) {
          setMessages(current => upsertMessage(current, result.message as Message))
          setMessagesConversationId(conversationId)
          messagesConversationIdRef.current = conversationId
        } else {
          await loadMessages(conversationId, { background: true })
        }
        setDraft('')
        setFiles([])
        if (fileInputRef.current) fileInputRef.current.value = ''
        void markConversationRead(conversationId)
        scheduleDetailReconciliation()
      }
      void loadConversations(undefined, { background: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible enviar el mensaje')
    } finally {
      setSending(false)
    }
  }

  async function changeStatus(nextStatus: Exclude<Status, 'all'>) {
    if (!selectedId) return
    const response = await fetch(`/api/inbox/conversations/${selectedId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }),
    })
    if (response.ok) await loadConversations()
  }

  const detailsPanel = selected ? (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contacto</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-muted"><UserRound className="h-4 w-4" /></div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selected.contact_name || 'Sin nombre'}</p>
            <p className="truncate text-xs text-muted-foreground">{selected.contact_email || selected.contact_phone || 'Sin datos'}</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vinculación</p>
        {selected.linked_client
          ? <Link href={`/dashboard/clients/${selected.linked_client.id}`} className="mt-2 block rounded-md border p-2 text-sm hover:bg-muted"><span className="font-medium">Cliente</span><br />{selected.linked_client.name}</Link>
          : <p className="mt-2 rounded-md border border-dashed p-2 text-sm text-muted-foreground">Consulta de potencial cliente sin vincular.</p>}
        <LinkClientDialog conversationId={selected.id} currentClient={selected.linked_client ?? null} onLinked={() => { void loadConversations(selected.id, { background: true }) }} trigger={<Button variant="outline" size="sm" className="mt-2 w-full">{selected.linked_client ? 'Cambiar vinculación' : 'Vincular a cliente'}</Button>} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Asignado a</p>
        <p className="mt-2 text-sm">{selected.assigned_user?.full_name || selected.assigned_user?.email || 'Sin asignar'}</p>
      </div>
    </div>
  ) : null

  return (
    <div className="flex h-[calc(100dvh-5.5rem)] flex-col gap-3 sm:h-[calc(100dvh-6rem)] md:h-[calc(100dvh-6.5rem)] md:gap-4 lg:h-[calc(100dvh-7rem)]">
      <div className={cn('flex flex-wrap items-center justify-between gap-3', mobilePane === 'chat' && 'hidden md:flex')}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Mensajes</h1>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">WhatsApp y email del estudio en una sola bandeja.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsComposing(true)} disabled={isComposing}><Mail className="h-4 w-4" /><span className="hidden sm:inline">Nueva conversación</span><span className="sm:hidden">Nueva</span></Button>
          <Button variant="outline" size="icon" aria-label="Actualizar" onClick={() => void loadConversations()} disabled={loading || isComposing} className="sm:hidden">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button variant="outline" onClick={() => void loadConversations()} disabled={loading || isComposing} className="hidden sm:inline-flex">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />Actualizar
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-xl border bg-background md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[330px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)_300px]">
        <aside className={cn('flex min-h-0 flex-col md:border-r', mobilePane === 'chat' && 'hidden md:flex')}>
          <div className="space-y-3 border-b p-3">
            <div className="grid grid-cols-2 gap-2">
              <select value={channel} onChange={(event) => setChannel(event.target.value as Channel)} className="h-9 rounded-md border bg-background px-2 text-sm">
                <option value="all">Todos los canales</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option>
              </select>
              <select value={status} onChange={(event) => setStatus(event.target.value as Status)} className="h-9 rounded-md border bg-background px-2 text-sm">
                <option value="open">Abiertas</option><option value="pending">Pendientes</option><option value="resolved">Resueltas</option><option value="all">Todas</option>
              </select>
            </div>
            <Input placeholder="Buscar próximamente" disabled />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {loading ? <p className="p-4 text-sm text-muted-foreground">Cargando conversaciones…</p> : null}
            {!loading && conversations.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No hay conversaciones para estos filtros.</p> : null}
            {conversations.map((conversation) => (
              <button key={conversation.id} onClick={() => selectConversation(conversation.id)} className={cn('w-full border-b px-3 py-3 text-left transition hover:bg-muted/60 active:bg-muted', selectedId === conversation.id && 'md:bg-muted')}>
                <div className="flex items-start gap-3">
                  <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted">
                    <UserRound className="h-5 w-5 text-muted-foreground" />
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border bg-background">
                      {conversation.channel === 'whatsapp' ? <MessageCircle className="h-2.5 w-2.5 text-emerald-600" /> : <Mail className="h-2.5 w-2.5 text-blue-600" />}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn('truncate text-sm', conversation.unread_count > 0 ? 'font-semibold' : 'font-medium')}>{conversation.contact_name || 'Sin nombre'}</span>
                      <span className={cn('shrink-0 text-xs', conversation.unread_count > 0 ? 'font-medium text-primary' : 'text-muted-foreground')}>{formatListDate(conversation.last_message_at)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className={cn('line-clamp-1 text-sm', conversation.unread_count > 0 ? 'text-foreground' : 'text-muted-foreground')}>{conversation.last_message_preview || conversation.email_subject || 'Sin mensajes'}</p>
                      {conversation.unread_count > 0 ? <Badge className="h-5 min-w-5 shrink-0 justify-center rounded-full px-1.5 text-[11px]">{conversation.unread_count}</Badge> : null}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </ScrollArea>
        </aside>

        <main className={cn('flex min-h-0 min-w-0 flex-col', mobilePane === 'list' && 'hidden md:flex')}>
          {!selected ? <div className="grid flex-1 place-items-center p-8 text-center text-muted-foreground"><MessageCircle className="mb-3 h-10 w-10" />Seleccioná una conversación para ver sus mensajes.</div> : <>
            <header className="flex items-center gap-1.5 border-b px-2 py-2 sm:gap-2 sm:px-4 sm:py-3">
              <Button variant="ghost" size="icon" aria-label="Volver a la lista" className="shrink-0 md:hidden" onClick={() => setMobilePane('list')}><ArrowLeft className="h-5 w-5" /></Button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-semibold">{selected.contact_name || 'Sin nombre'}</h2>
                  <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">{channelLabel(selected.channel)}</Badge>
                  {selected.email_account ? <Badge variant="outline" className="hidden shrink-0 lg:inline-flex">{selected.email_account.account_type === 'shared' ? 'Compartida' : 'Personal'}</Badge> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">{selected.contact_email || selected.contact_phone || 'Contacto sin datos'}{selected.email_account ? ` · Desde: ${selected.email_account.display_name || selected.email_account.email_address}` : ''}</p>
              </div>
              <select value={selected.status} onChange={(event) => void changeStatus(event.target.value as Exclude<Status, 'all'>)} className="h-9 shrink-0 rounded-md border bg-background px-2 text-sm"><option value="open">Abierta</option><option value="pending">Pendiente</option><option value="resolved">Resuelta</option><option value="spam">Spam</option></select>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Detalles de la conversación" className="shrink-0 xl:hidden"><Info className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto">
                  <SheetHeader><SheetTitle>Detalles</SheetTitle></SheetHeader>
                  <div className="px-4 pb-6">{detailsPanel}</div>
                </SheetContent>
              </Sheet>
            </header>
            <ScrollArea className="min-h-0 flex-1 bg-muted/20 p-3 sm:p-4">
              {detailLoading ? <p className="text-sm text-muted-foreground">Cargando mensajes…</p> : null}
              <div className="space-y-2 sm:space-y-3">
                {visibleMessages.map((message) => <div key={message.id} className={cn('flex', message.direction === 'outbound' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm md:max-w-[75%] lg:max-w-[65%]', message.direction === 'outbound' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-background border')}><p className="whitespace-pre-wrap">{message.content || `[${message.content_type}]`}</p>{selected.channel === 'email' && message.email_account ? <p className="mt-2 border-t border-current/15 pt-1 text-[10px] opacity-75">{message.direction === 'outbound' ? 'Enviado desde' : 'Recibido en'}: {message.email_account.display_name || message.email_account.email_address}</p> : null}{message.attachments?.length ? <div className="mt-2 space-y-1">{message.attachments.map((attachment, index) => attachment.attachmentId ? <a key={attachment.attachmentId} href={`/api/inbox/attachments/${attachment.attachmentId}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs underline underline-offset-2 opacity-90"><FileText className="h-3.5 w-3.5" />{attachment.filename || 'Archivo adjunto'}</a> : <div key={index} className="flex items-center gap-1.5 text-xs opacity-90"><FileText className="h-3.5 w-3.5" />{attachment.filename || attachment.type || 'Archivo adjunto'}</div>)}</div> : null}<div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">{formatDate(message.sent_at || message.created_at)}{message.direction === 'outbound' && message.wa_status ? <CheckCheck className="h-3 w-3" /> : null}</div></div></div>)}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>
            <div className="border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-3 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
              <div className="flex items-end gap-1.5 sm:gap-2">
                <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 md:h-10 md:w-10" title="Adjuntar archivo" onClick={() => fileInputRef.current?.click()} disabled={selected.status === 'resolved' || selected.status === 'spam' || sending}><Paperclip className="h-5 w-5 md:h-4 md:w-4" /></Button>
                <Textarea rows={1} value={draft} onFocus={() => void markConversationRead(selected.id)} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !isMobile) { event.preventDefault(); void sendReply() } }} placeholder={selected.status === 'resolved' ? 'La conversación está resuelta' : 'Escribí una respuesta…'} disabled={selected.status === 'resolved' || selected.status === 'spam' || sending} className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl md:min-h-10" />
                <Button size="icon" className="h-11 w-11 shrink-0 rounded-full md:h-10 md:w-10" title={sending ? 'Enviando…' : 'Enviar'} onClick={() => void sendReply()} disabled={(!draft.trim() && files.length === 0) || sending || selected.status === 'resolved' || selected.status === 'spam'}><Send className="h-5 w-5 md:h-4 md:w-4" /></Button>
              </div>
              {files.length > 0 ? <div className="mt-2 flex flex-wrap gap-1">{files.map(file => <Badge key={`${file.name}-${file.size}`} variant="secondary" className="max-w-full gap-1"><FileText className="h-3 w-3" /><span className="truncate">{file.name}</span></Badge>)}</div> : null}
              <p className={cn('mt-1 text-xs text-muted-foreground', sending ? 'block' : 'hidden md:block')}>{sending ? 'Enviando… El mensaje aparecerá cuando quede guardado.' : 'Enter para enviar · Shift + Enter para salto de línea · máximo 50 MB por archivo'}</p>
            </div>
          </>}</main>

        <aside className="hidden min-h-0 overflow-y-auto border-l p-4 xl:block">
          {detailsPanel}
        </aside>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {isComposing ? (
        <InboxComposer
          accounts={accounts}
          templates={templates}
          loading={composeLoading}
          onCancel={() => setIsComposing(false)}
          onCreated={(id) => { setIsComposing(false); void loadConversations(id) }}
        />
      ) : null}
    </div>
  )
}
