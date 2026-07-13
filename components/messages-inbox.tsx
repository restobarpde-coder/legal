'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  CheckCheck,
  FileText,
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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { InboxComposer, type InboxAccount } from '@/components/inbox-composer'
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

function matchesConversationFilters(conversation: Conversation, channel: Channel, status: Status) {
  return (channel === 'all' || conversation.channel === channel)
    && (status === 'all' || conversation.status === status)
}

function upsertConversation(
  items: Conversation[],
  incoming: Conversation,
  channel: Channel,
  status: Status
) {
  const existing = items.find(item => item.id === incoming.id)
  const merged = existing ? { ...existing, ...incoming } : incoming
  const withoutIncoming = items.filter(item => item.id !== incoming.id)
  const next = matchesConversationFilters(merged, channel, status)
    ? [...withoutIncoming, merged]
    : withoutIncoming
  return sortConversations(next)
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
  return sortMessages([...items.filter(item => item.id !== incoming.id), merged])
}

function formatDate(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('es-UY', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(value))
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
  const [isComposing, setIsComposing] = useState(false)
  const [accounts, setAccounts] = useState<InboxAccount[]>([])
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; language_code: string }>>([])
  const [composeLoading, setComposeLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectedIdRef = useRef<string | null>(null)
  const messagesConversationIdRef = useRef<string | null>(null)
  const channelRef = useRef<Channel>(channel)
  const statusRef = useRef<Status>(status)
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

  channelRef.current = channel
  statusRef.current = status

  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])
  useEffect(() => { messagesConversationIdRef.current = messagesConversationId }, [messagesConversationId])

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId]
  )
  const visibleMessages = messagesConversationId === selectedId ? messages : []

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
      const nextConversations = sortConversations(result.conversations ?? [])
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
  }, [channel, status])

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
      setMessages(sortMessages(result.messages ?? []))
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
    let hasSubscribed = false
    let needsRecovery = false
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inbox_messages' }, (payload) => {
        if (!active) return
        const message = payload.new as Message
        if (message.conversation_id && message.conversation_id === selectedIdRef.current) {
          setMessages(current => messagesConversationIdRef.current === message.conversation_id
            ? upsertMessage(current, message)
            : [message])
          setMessagesConversationId(message.conversation_id)
          messagesConversationIdRef.current = message.conversation_id
          scheduleDetailReconciliation()
          if (message.direction === 'inbound' && document.visibilityState === 'visible') {
            void markConversationRead(message.conversation_id)
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inbox_messages' }, (payload) => {
        if (!active) return
        const message = payload.new as Message
        if (message.conversation_id && message.conversation_id === selectedIdRef.current) {
          setMessages(current => messagesConversationIdRef.current === message.conversation_id
            ? upsertMessage(current, message)
            : [message])
          setMessagesConversationId(message.conversation_id)
          messagesConversationIdRef.current = message.conversation_id
          scheduleDetailReconciliation()
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_conversations' }, (payload) => {
        if (!active) return
        if (payload.eventType === 'DELETE') {
          const removed = payload.old as { id?: string }
          if (removed.id) setConversations(current => current.filter(conversation => conversation.id !== removed.id))
        } else {
          const updated = payload.new as Conversation
          if (updated.id) {
            setConversations(current => upsertConversation(
              current,
              updated,
              channelRef.current,
              statusRef.current
            ))
            if (updated.id === selectedIdRef.current
              && updated.unread_count > 0
              && document.visibilityState === 'visible') {
              void markConversationRead(updated.id)
            }
          }
        }
        scheduleListReconciliation()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        if (!active) return
        const notification = payload.new as {
          related_entity_type?: string | null
          related_entity_id?: string | null
          metadata?: { conversation_id?: string } | null
        }
        const conversationId = notification.related_entity_type === 'inbox_conversation'
          ? notification.related_entity_id
          : notification.related_entity_type === 'inbox_message'
            ? notification.metadata?.conversation_id
            : null
        if (!conversationId) return

        // Notifications are persisted after message ingestion, so they are a
        // reliable final signal to reconcile any delayed/missed message event.
        scheduleListReconciliation(0)
        if (conversationId === selectedIdRef.current) scheduleDetailReconciliation(0)
      })
      .subscribe((subscriptionStatus) => {
        if (!active) return
        if (subscriptionStatus === 'SUBSCRIBED') {
          if (hasSubscribed && needsRecovery) {
            scheduleListReconciliation(0)
            scheduleDetailReconciliation(0)
          }
          hasSubscribed = true
          needsRecovery = false
          return
        }
        if (hasSubscribed) needsRecovery = true
      })

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [markConversationRead, scheduleDetailReconciliation, scheduleListReconciliation, supabase])

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
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      scheduleListReconciliation(0)
      scheduleDetailReconciliation(0)
    }, 15_000)

    return () => window.clearInterval(interval)
  }, [scheduleDetailReconciliation, scheduleListReconciliation])

  useEffect(() => () => {
    conversationsAbortRef.current?.abort()
    messagesAbortRef.current?.abort()
    if (listReconciliationTimerRef.current) clearTimeout(listReconciliationTimerRef.current)
    if (detailReconciliationTimerRef.current) clearTimeout(detailReconciliationTimerRef.current)
  }, [])

  async function sendReply() {
    if (!selectedId || (!draft.trim() && files.length === 0)) return
    const conversationId = selectedId
    setSending(true)
    setError(null)
    const optimisticId = `local-${Date.now()}`
    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: selectedId,
      direction: 'outbound',
      content: draft.trim() || `[${files.length} archivo${files.length === 1 ? '' : 's'}]`,
      content_type: 'text',
      sender_name: 'Vos',
      wa_status: 'pending',
      attachments: files.map(file => ({ filename: file.name, mimeType: file.type, size: file.size })),
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
    setMessages(current => [...current, optimisticMessage])
    try {
      const uploadedFiles = await Promise.all(files.map(async file => {
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
        body: JSON.stringify({ content: draft.trim(), attachments: uploadedFiles }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (result.message_id && selectedIdRef.current === conversationId) {
          await loadMessages(conversationId, { background: true })
        }
        throw new Error(result.error ?? 'No fue posible enviar el mensaje')
      }
      if (selectedIdRef.current === conversationId) {
        const persistedMessage: Message = result.message ?? {
          ...optimisticMessage,
          id: result.message_id,
          wa_status: selected?.channel === 'whatsapp' ? 'sent' : null,
        }
        setMessages(current => upsertMessage(
          current.filter(message => message.id !== optimisticId),
          persistedMessage
        ))
        setMessagesConversationId(conversationId)
        messagesConversationIdRef.current = conversationId
        setDraft('')
        setFiles([])
        if (fileInputRef.current) fileInputRef.current.value = ''
        scheduleDetailReconciliation()
      }
      void loadConversations(undefined, { background: true })
    } catch (err) {
      if (selectedIdRef.current === conversationId) {
        setMessages(current => current.filter(message => message.id !== optimisticId))
      }
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

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[620px] flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mensajes</h1>
          <p className="mt-1 text-sm text-muted-foreground">WhatsApp y email del estudio en una sola bandeja.</p>
        </div>
        <div className="flex gap-2"><Button onClick={() => setIsComposing(true)} disabled={isComposing}><Mail className="mr-2 h-4 w-4" />Nueva conversación</Button><Button variant="outline" onClick={() => void loadConversations()} disabled={loading || isComposing}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Actualizar
        </Button></div>
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border bg-background lg:grid-cols-[330px_minmax(0,1fr)_280px]">
        <aside className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-r">
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
              <button key={conversation.id} onClick={() => selectConversation(conversation.id)} className={cn('w-full border-b px-4 py-3 text-left transition hover:bg-muted/60', selectedId === conversation.id && 'bg-muted')}>
                <div className="flex items-center justify-between gap-2"><span className="truncate font-medium">{conversation.contact_name || 'Sin nombre'}</span>{conversation.unread_count > 0 ? <Badge className="rounded-full px-2">{conversation.unread_count}</Badge> : null}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">{conversation.channel === 'whatsapp' ? <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> : <Mail className="h-3.5 w-3.5 text-blue-600" />}<span>{channelLabel(conversation.channel)}</span><span>·</span><span>{formatDate(conversation.last_message_at)}</span></div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{conversation.last_message_preview || conversation.email_subject || 'Sin mensajes'}</p>
              </button>
            ))}
          </ScrollArea>
        </aside>

        <main className="flex min-h-0 flex-col">
          {isComposing ? <InboxComposer accounts={accounts} templates={templates} loading={composeLoading} onCancel={() => setIsComposing(false)} onCreated={(id) => { setIsComposing(false); void loadConversations(id) }} /> : !selected ? <div className="grid flex-1 place-items-center p-8 text-center text-muted-foreground"><MessageCircle className="mb-3 h-10 w-10" />Seleccioná una conversación para ver sus mensajes.</div> : <>
            <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold">{selected.contact_name || 'Sin nombre'}</h2><Badge variant="secondary">{channelLabel(selected.channel)}</Badge>{selected.email_account ? <Badge variant="outline">{selected.email_account.account_type === 'shared' ? 'Compartida' : 'Personal'}</Badge> : null}</div><p className="truncate text-xs text-muted-foreground">{selected.contact_email || selected.contact_phone || 'Contacto sin datos'}{selected.email_account ? ` · Desde: ${selected.email_account.display_name || selected.email_account.email_address}` : ''}</p></div>
              <select value={selected.status} onChange={(event) => void changeStatus(event.target.value as Exclude<Status, 'all'>)} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="open">Abierta</option><option value="pending">Pendiente</option><option value="resolved">Resuelta</option><option value="spam">Spam</option></select>
            </header>
            <ScrollArea className="min-h-0 flex-1 bg-muted/20 p-4">
              {detailLoading ? <p className="text-sm text-muted-foreground">Cargando mensajes…</p> : null}
              <div className="space-y-3">
                {visibleMessages.map((message) => <div key={message.id} className={cn('flex', message.direction === 'outbound' ? 'justify-end' : 'justify-start')}><div className={cn('max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm', message.direction === 'outbound' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-background border')}><p className="whitespace-pre-wrap">{message.content || `[${message.content_type}]`}</p>{selected.channel === 'email' && message.email_account ? <p className="mt-2 border-t border-current/15 pt-1 text-[10px] opacity-75">{message.direction === 'outbound' ? 'Enviado desde' : 'Recibido en'}: {message.email_account.display_name || message.email_account.email_address}</p> : null}{message.attachments?.length ? <div className="mt-2 space-y-1">{message.attachments.map((attachment, index) => attachment.attachmentId ? <a key={attachment.attachmentId} href={`/api/inbox/attachments/${attachment.attachmentId}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs underline underline-offset-2 opacity-90"><FileText className="h-3.5 w-3.5" />{attachment.filename || 'Archivo adjunto'}</a> : <div key={index} className="flex items-center gap-1.5 text-xs opacity-90"><FileText className="h-3.5 w-3.5" />{attachment.filename || attachment.type || 'Archivo adjunto'}</div>)}</div> : null}<div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">{formatDate(message.sent_at || message.created_at)}{message.direction === 'outbound' && message.wa_status ? <CheckCheck className="h-3 w-3" /> : null}</div></div></div>)}
              </div>
            </ScrollArea>
            <div className="border-t p-3"><input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /><div className="flex gap-2"><Button variant="ghost" size="icon" title="Adjuntar archivo" onClick={() => fileInputRef.current?.click()} disabled={selected.status === 'resolved' || selected.status === 'spam' || sending}><Paperclip className="h-4 w-4" /></Button><Textarea value={draft} onFocus={() => void markConversationRead(selected.id)} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendReply() } }} placeholder={selected.status === 'resolved' ? 'La conversación está resuelta' : 'Escribí una respuesta…'} disabled={selected.status === 'resolved' || selected.status === 'spam' || sending} className="min-h-10 resize-none" /><Button size="icon" onClick={() => void sendReply()} disabled={(!draft.trim() && files.length === 0) || sending || selected.status === 'resolved' || selected.status === 'spam'}><Send className="h-4 w-4" /></Button></div>{files.length > 0 ? <div className="mt-2 flex flex-wrap gap-1">{files.map(file => <Badge key={`${file.name}-${file.size}`} variant="secondary" className="gap-1"><FileText className="h-3 w-3" />{file.name}</Badge>)}</div> : null}<p className="mt-1 text-xs text-muted-foreground">Enter para enviar · Shift + Enter para salto de línea · máximo 50 MB por archivo</p></div>
          </>}</main>

        <aside className="hidden min-h-0 border-l p-4 lg:block">
          {selected ? <div className="space-y-5"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contacto</p><div className="mt-2 flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-full bg-muted"><UserRound className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-medium">{selected.contact_name || 'Sin nombre'}</p><p className="truncate text-xs text-muted-foreground">{selected.contact_email || selected.contact_phone || 'Sin datos'}</p></div></div></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vinculación</p>{selected.linked_client ? <Link href={`/dashboard/clients/${selected.linked_client.id}`} className="mt-2 block rounded-md border p-2 text-sm hover:bg-muted"><span className="font-medium">Cliente</span><br />{selected.linked_client.name}</Link> : <p className="mt-2 rounded-md border border-dashed p-2 text-sm text-muted-foreground">Consulta de potencial cliente. Podrás vincularla desde el panel administrativo.</p>}</div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Asignado a</p><p className="mt-2 text-sm">{selected.assigned_user?.full_name || selected.assigned_user?.email || 'Sin asignar'}</p></div></div> : null}
        </aside>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
