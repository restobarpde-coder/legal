'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import './inbox/workspace.css'
import { useSearchParams } from 'next/navigation'
import {
  Search,
  Plus,
  BriefcaseBusiness,
  ArrowLeft,
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
import type { InboxTemplate } from '@/components/inbox/conversation-form'
import { InboxComposer, type InboxAccount } from '@/components/inbox-composer'
import { LinkClientDialog } from '@/components/inbox/link-client-dialog'
import { MessageBubble } from '@/components/inbox/message-bubble'
import { ComposerAttachmentTray } from '@/components/inbox/composer-attachment-tray'
import { AudioRecorderButton } from '@/components/inbox/audio-recorder-button'
import { MediaLightbox, type LightboxItem } from '@/components/inbox/media-lightbox'
import { compressImageIfNeeded } from '@/lib/inbox/image-compression'
import { WHATSAPP_MEDIA_LIMITS, validateWhatsAppMediaSize } from '@/lib/inbox/media-limits'
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
  linked_case_id: string | null
  linked_case?: { id: string; title: string } | null
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
  const [search, setSearch] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [channel, setChannel] = useState<Channel>('all')
  const [status, setStatus] = useState<Status>('open')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesConversationId, setMessagesConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [templateIndex, setTemplateIndex] = useState(0)
  const [dismissTemplates, setDismissTemplates] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isComposing, setIsComposing] = useState(false)
  // Master-detail en móvil: se muestra la lista o el chat, nunca ambos.
  const [mobilePane, setMobilePane] = useState<'list' | 'chat'>('list')
  const isMobile = useIsMobile()
  const [accounts, setAccounts] = useState<InboxAccount[]>([])
  const [templates, setTemplates] = useState<InboxTemplate[]>([])
  const [composeLoading, setComposeLoading] = useState(false)
  const [isRecorderActive, setIsRecorderActive] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
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
  const filteredConversations = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const query = normalize(search.trim())
    return conversations.filter(conversation =>
      (!unreadOnly || conversation.unread_count > 0) &&
      (!query || normalize([conversation.contact_name, conversation.contact_phone, conversation.contact_email, conversation.last_message_preview, conversation.email_subject].filter(Boolean).join(' ')).includes(query))
    )
  }, [conversations, search, unreadOnly])
  const selectedTemplate = templates.find(template => template.id === templateId)
  const showTemplates = selected?.channel === 'whatsapp' && draft.startsWith('/') && !dismissTemplates && !selectedTemplate && !isRecorderActive
  const matchingTemplates = templates.filter(template => `${template.title ?? ''} ${template.name}`.toLowerCase().includes(draft.slice(1).trim().toLowerCase()))
  useEffect(() => { setTemplateId(''); setTemplateIndex(0); setDismissTemplates(false) }, [selectedId])
  function chooseTemplate(template: InboxTemplate) { setTemplateId(template.id); setDraft(''); setTemplateIndex(0) }
  const visibleMessages = messagesConversationId === selectedId ? messages : []

  const mediaItems = useMemo<LightboxItem[]>(() => {
    const items: LightboxItem[] = []
    for (const message of visibleMessages) {
      if (message.content_type !== 'image' && message.content_type !== 'video') continue
      for (const attachment of message.attachments ?? []) {
        if (!attachment.attachmentId) continue
        items.push({
          attachmentId: attachment.attachmentId,
          kind: message.content_type,
          url: `/api/inbox/attachments/${attachment.attachmentId}`,
          filename: attachment.filename,
          senderName: message.sender_name,
          sentAt: message.sent_at ?? message.created_at,
        })
      }
    }
    return items
  }, [visibleMessages])

  const openLightbox = useCallback((attachmentId: string) => {
    const index = mediaItems.findIndex((item) => item.attachmentId === attachmentId)
    if (index >= 0) setLightboxIndex(index)
  }, [mediaItems])

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

  // Chat shortcuts need the catalog even when the compose panel was never opened.
  useEffect(() => {
    let active = true
    void fetch('/api/inbox/templates', { cache: 'no-store' })
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? 'No fue posible cargar las plantillas')
        return result
      })
      .then(result => { if (active) setTemplates(result.templates ?? []) })
      .catch(() => { if (active) setError('No fue posible cargar las plantillas. Recargá la página para reintentar.') })
    return () => { active = false }
  }, [isComposing])

  useEffect(() => {
    if (!isComposing) return
    let active = true
    setComposeLoading(true)
    void fetch('/api/inbox/email-accounts')
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error('No fue posible cargar las casillas de email')
        return result
      })
      .then(result => { if (active) setAccounts(result.accounts ?? []) })
      .catch(() => { if (active) setError('No fue posible cargar las casillas de email') })
      .finally(() => { if (active) setComposeLoading(false) })
    return () => { active = false }
  }, [isComposing])

  useEffect(() => {
    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
          console.warn('[Realtime] No session, skipping subscription')
          return
        }

        await supabase.realtime.setAuth()
        console.log('[Realtime] Authenticated')
      } catch (err) {
        console.error('[Realtime] Auth failed:', err)
        return
      }

      if (!active) return

      channel = supabase
        .channel('inbox-realtime', { config: { broadcast: { self: true } } })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_messages' }, (payload) => {
          if (!active) return
          console.log('[Realtime] Message event:', payload.eventType, payload.new)
          const message = payload.new as Message
          if (!message.conversation_id) return

          if (payload.eventType === 'INSERT') {
            if (message.conversation_id === selectedIdRef.current) {
              setMessages(current => [...sortMessages([...current, message])])
            }
            scheduleListReconciliation(0)
          } else if (payload.eventType === 'UPDATE') {
            if (message.conversation_id === selectedIdRef.current) {
              setMessages(current => sortMessages(
                current.map(m => m.id === message.id ? message : m)
              ))
            }
            scheduleListReconciliation(0)
          }

          if (message.conversation_id === selectedIdRef.current) {
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_conversations' }, (payload) => {
          if (!active) return
          console.log('[Realtime] Conversation event:', payload.eventType)
          scheduleListReconciliation(0)
        })

      channel.subscribe((subscriptionStatus) => {
        if (!active) return
        console.log('[Realtime] Subscription status:', subscriptionStatus)
        if (subscriptionStatus === 'SUBSCRIBED') {
          scheduleListReconciliation(0)
          scheduleDetailReconciliation(0)
        }
      })
    })()

    return () => {
      active = false
      if (channel) void supabase.removeChannel(channel)
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

  async function addFiles(newFiles: File[]) {
    if (!selected || newFiles.length === 0) return
    if (selectedTemplate) {
      setError('Quitá la plantilla seleccionada para adjuntar archivos.')
      return
    }
    const accepted: File[] = []
    for (const file of newFiles) {
      let candidate = file
      if (selected.channel === 'whatsapp') {
        if (candidate.type.startsWith('image/') && candidate.size > WHATSAPP_MEDIA_LIMITS.image) {
          candidate = await compressImageIfNeeded(candidate, WHATSAPP_MEDIA_LIMITS.image)
        }
        const sizeError = validateWhatsAppMediaSize(candidate)
        if (sizeError) {
          setError(sizeError)
          continue
        }
      }
      accepted.push(candidate)
    }
    if (accepted.length) setFiles((current) => [...current, ...accepted])
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index))
  }

  async function sendReply(options: { filesOverride?: File[] } = {}) {
    if (!selectedId) return
    if (sending) return
    const templateToSend = options.filesOverride ? undefined : selectedTemplate
    if (!options.filesOverride && showTemplates) return
    const replyFiles = templateToSend ? [] : options.filesOverride ?? [...files]
    const replyContent = templateToSend ? '' : draft.trim()
    if (!templateToSend && !replyContent && replyFiles.length === 0) return
    const conversationId = selectedId
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
        body: JSON.stringify({ content: replyContent, attachments: uploadedFiles, template_id: templateToSend?.id }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (result.message_id && selectedIdRef.current === conversationId) {
          await loadMessages(conversationId, { background: true })
        }
        throw new Error(result.error ?? 'No fue posible enviar el mensaje')
      }
      if (selectedIdRef.current === conversationId) {
        if (!options.filesOverride) {
          setDraft('')
          setTemplateId('')
          setFiles([])
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
        void markConversationRead(conversationId)
      }
      await Promise.all([
        selectedIdRef.current === conversationId
          ? loadMessages(conversationId, { background: true })
          : Promise.resolve(),
        loadConversations(undefined, { background: true }),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible enviar el mensaje')
    } finally {
      setSending(false)
    }
  }

  function handleSendVoiceNote(file: File) {
    void sendReply({ filesOverride: [file] })
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
        <p className="text-sm font-semibold text-foreground">Contacto</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-muted"><UserRound className="h-4 w-4" /></div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selected.contact_name || 'Sin nombre'}</p>
            <p className="truncate text-xs text-muted-foreground">{selected.contact_email || selected.contact_phone || 'Sin datos'}</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Vinculación</p>
        {selected.linked_client
          ? <Link href={`/dashboard/clients/${selected.linked_client.id}`} className="mt-2 block rounded-md border p-2 text-sm hover:bg-muted"><span className="font-medium">Cliente</span><br />{selected.linked_client.name}</Link>
          : <p className="mt-2 rounded-md border border-dashed p-2 text-sm text-muted-foreground">Consulta de potencial cliente sin vincular.</p>}
        <LinkClientDialog conversationId={selected.id} currentClient={selected.linked_client ?? null} onLinked={() => { void loadConversations(selected.id, { background: true }) }} trigger={<Button variant="outline" size="sm" className="mt-2 w-full">{selected.linked_client ? 'Cambiar vinculación' : 'Vincular a cliente'}</Button>} />
      </div>
      {selected.linked_case ? <div><p className="text-sm font-semibold text-foreground">Caso vinculado</p><Link href={`/dashboard/cases/${selected.linked_case.id}`} className="mt-2 flex items-center gap-2 rounded-lg bg-muted p-3 text-sm hover:bg-accent"><BriefcaseBusiness className="h-4 w-4 shrink-0" /><span className="break-words">{selected.linked_case.title}</span></Link></div> : null}
      <div>
        <p className="text-sm font-semibold text-foreground">Asignado a</p>
        <p className="mt-2 text-sm">{selected.assigned_user?.full_name || selected.assigned_user?.email || 'Sin asignar'}</p>
      </div>
    </div>
  ) : null

  return (
    <div className="inbox-workspace flex h-[calc(100dvh-5.5rem)] flex-col gap-3 sm:h-[calc(100dvh-6rem)] md:h-[calc(100dvh-6.5rem)] md:gap-4 lg:h-[calc(100dvh-7rem)]">
      <div className={cn('flex flex-wrap items-center justify-between gap-3', mobilePane === 'chat' && 'hidden md:flex')}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Conversaciones</h1>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">Cada consulta, más cerca de una solución.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsComposing(true)} disabled={isComposing}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Nueva conversación</span><span className="sm:hidden">Nueva</span></Button>
          <Button variant="outline" size="icon" aria-label="Actualizar" onClick={() => void loadConversations()} disabled={loading || isComposing} className="sm:hidden">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button variant="outline" onClick={() => void loadConversations()} disabled={loading || isComposing} className="hidden sm:inline-flex">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />Actualizar
          </Button>
        </div>
      </div>

      <div className="inbox-frame grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-2xl border bg-background md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)_280px]">
        <aside className={cn('inbox-list flex min-h-0 flex-col md:border-r', mobilePane === 'chat' && 'hidden md:flex')}>
          <div className="space-y-3 border-b p-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Tu bandeja</h2><span className="text-xs text-muted-foreground">{conversations.length} conversaciones</span></div>
            <div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar entre las conversaciones cargadas" placeholder="Buscar nombre, teléfono o mensaje" value={search} onChange={event => setSearch(event.target.value)} className="h-10 rounded-xl border-0 bg-muted pl-9" /></div>
            <div className="flex gap-2"><button type="button" aria-pressed={!unreadOnly} className={cn('inbox-filter', !unreadOnly && 'is-active')} onClick={() => setUnreadOnly(false)}>Todas</button><button type="button" aria-pressed={unreadOnly} className={cn('inbox-filter', unreadOnly && 'is-active')} onClick={() => setUnreadOnly(true)}>No leídas</button></div>
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="Filtrar por canal" value={channel} onChange={(event) => setChannel(event.target.value as Channel)} className="h-9 min-w-0 rounded-md border bg-background px-2 text-sm">
                <option value="all">Todos los canales</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option>
              </select>
              <select aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value as Status)} className="h-9 min-w-0 rounded-md border bg-background px-2 text-sm">
                <option value="open">Abiertas</option><option value="pending">Pendientes</option><option value="resolved">Resueltas</option><option value="all">Todas</option>
              </select>
            </div>

          </div>
          <ScrollArea className="min-h-0 flex-1">
            {loading ? <p className="p-4 text-sm text-muted-foreground">Cargando conversaciones…</p> : null}
            {!loading && filteredConversations.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No encontramos conversaciones. Probá con otra búsqueda o cambiá los filtros.</p> : null}
            {filteredConversations.map((conversation) => (
              <button key={conversation.id} onClick={() => selectConversation(conversation.id)} aria-current={selectedId === conversation.id ? 'true' : undefined} className={cn('inbox-conversation w-full px-4 py-4 text-left transition-colors', selectedId === conversation.id && 'is-selected')}>
                <div className="flex items-start gap-3">
                  <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted">
                    <span className="text-sm font-semibold text-primary">{(conversation.contact_name || conversation.contact_phone || conversation.contact_email || '?').slice(0, 2).toUpperCase()}</span>
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border bg-background">
                      {conversation.channel === 'whatsapp' ? <MessageCircle className="h-2.5 w-2.5 text-emerald-600" /> : <Mail className="h-2.5 w-2.5 text-blue-600" />}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn('truncate text-sm', conversation.unread_count > 0 ? 'font-semibold' : 'font-medium')}>{conversation.contact_name || conversation.contact_phone || conversation.contact_email || 'Contacto sin nombre'}</span>
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

        <main
          className={cn('inbox-thread relative flex min-h-0 min-w-0 flex-col', mobilePane === 'list' && 'hidden md:flex')}
          onDragOver={(event) => { if (selected) { event.preventDefault(); setIsDraggingFile(true) } }}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDraggingFile(false) }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDraggingFile(false)
            const dropped = Array.from(event.dataTransfer.files ?? [])
            if (dropped.length) void addFiles(dropped)
          }}
        >
          {isDraggingFile ? (
            <div className="pointer-events-none absolute inset-2 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-primary bg-background/90 text-sm font-medium text-primary">
              Soltá los archivos para adjuntarlos
            </div>
          ) : null}
          {!selected ? <div className="inbox-empty flex flex-1 flex-col items-center justify-center p-8 text-center"><div className="mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-primary/10 text-primary"><MessageCircle className="h-9 w-9" strokeWidth={1.5} /></div><h2 className="text-2xl font-semibold tracking-tight">Una buena atención empieza acá</h2><p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">Seleccioná una conversación para continuar la consulta, compartir documentos y acompañar a tus clientes.</p><Button variant="outline" className="mt-6" onClick={() => setIsComposing(true)}><Plus className="h-4 w-4" />Iniciar conversación</Button><p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground"><BriefcaseBusiness className="h-4 w-4" />Centro de Asesoramiento Paysandú</p></div> : <>
            <header className="inbox-chat-header flex items-center gap-2 border-b px-2 py-3 sm:gap-3 sm:px-5 sm:py-4">
              <Button variant="ghost" size="icon" aria-label="Volver a la lista" className="shrink-0 md:hidden" onClick={() => setMobilePane('list')}><ArrowLeft className="h-5 w-5" /></Button>
              <div aria-hidden="true" className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground sm:grid">{(selected.contact_name || selected.contact_phone || '?').slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-semibold">{selected.contact_name || selected.contact_phone || selected.contact_email || 'Contacto sin nombre'}</h2>
                  <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">{channelLabel(selected.channel)}</Badge>
                  {selected.email_account ? <Badge variant="outline" className="hidden shrink-0 lg:inline-flex">{selected.email_account.account_type === 'shared' ? 'Compartida' : 'Personal'}</Badge> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">{selected.contact_email || selected.contact_phone || 'Contacto sin datos'}{selected.email_account ? ` · Desde: ${selected.email_account.display_name || selected.email_account.email_address}` : ''}</p>
              </div>
              <select aria-label="Estado de la conversación" value={selected.status} onChange={(event) => void changeStatus(event.target.value as Exclude<Status, 'all'>)} className="h-9 shrink-0 rounded-md border bg-background px-2 text-sm"><option value="open">Abierta</option><option value="pending">Pendiente</option><option value="resolved">Resuelta</option><option value="spam">Spam</option></select>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Detalles de la conversación" className="shrink-0 2xl:hidden"><Info className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto">
                  <SheetHeader><SheetTitle>Detalles</SheetTitle></SheetHeader>
                  <div className="px-4 pb-6">{detailsPanel}</div>
                </SheetContent>
              </Sheet>
            </header>
            <ScrollArea className="inbox-message-canvas min-h-0 flex-1 p-4 sm:p-6">
              {detailLoading ? <p className="text-sm text-muted-foreground">Cargando mensajes…</p> : null}
              <div className="space-y-2 sm:space-y-3">
                {!detailLoading && visibleMessages.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay mensajes en esta conversación.</p> : null}
                {visibleMessages.map((message, index) => (
                  <div key={message.id}>
                    {(index === 0 || new Date(message.sent_at || message.created_at).toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' }) !== new Date(visibleMessages[index - 1].sent_at || visibleMessages[index - 1].created_at).toLocaleDateString('es-UY', { timeZone: 'America/Montevideo' })) ? <div className="mb-5 mt-3 flex justify-center"><span className="inbox-date-label">{new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long', timeZone: 'America/Montevideo' }).format(new Date(message.sent_at || message.created_at))}</span></div> : null}
                  <div key={message.id} className={cn('flex', message.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                    <MessageBubble
                      message={message}
                      channel={selected.channel}
                      timeLabel={new Intl.DateTimeFormat('es-UY', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Montevideo' }).format(new Date(message.sent_at || message.created_at))}
                      linkedClientId={selected.linked_client_id}
                      linkedCaseId={selected.linked_case_id}
                      onOpenLightbox={openLightbox}
                    />
                  </div>
                  </div>
                ))}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>
            <div className="inbox-reply border-t p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-3 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  void addFiles(Array.from(event.target.files ?? []))
                  event.target.value = ''
                }}
              />
              {showTemplates ? <div role="listbox" id="chat-template-list" aria-label="Plantillas de WhatsApp" className="mb-3 max-h-[min(24rem,45dvh)] overflow-y-auto rounded-xl border bg-background p-2 shadow-sm">
                <p className="px-3 py-2 text-xs text-muted-foreground">Plantillas · elegí el mensaje que querés enviar</p>
                {matchingTemplates.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No encontramos plantillas para esa búsqueda.</p> : matchingTemplates.map((template, index) => <button type="button" role="option" aria-selected={index === templateIndex} id={`chat-template-${index}`} key={template.id} disabled={sending || files.length > 0 || selected.status === 'resolved' || selected.status === 'spam'} onClick={() => chooseTemplate(template)} className={cn('block w-full rounded-lg p-3 text-left hover:bg-accent disabled:opacity-50', index === templateIndex && 'bg-accent')}><span className="block text-sm font-medium">{template.title ?? template.name}</span><span className="mt-1 block whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{template.body ?? 'El contenido de esta plantilla no está disponible en la vista previa.'}</span><span className="mt-2 block text-xs text-muted-foreground">/{template.name} · {template.language_code}</span></button>)}
                {files.length > 0 ? <p className="px-3 py-2 text-xs text-destructive">Quitá los adjuntos para enviar una plantilla.</p> : null}
              </div> : null}
              {selectedTemplate ? <div className="mb-3 rounded-xl border bg-background p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{selectedTemplate.title ?? selectedTemplate.name}</p><Button variant="ghost" size="sm" disabled={sending} onClick={() => setTemplateId('')}>Quitar</Button></div><p className="mt-2 whitespace-pre-wrap text-sm">{selectedTemplate.body ?? 'Se enviará el contenido aprobado en Meta.'}</p><p className="mt-2 text-xs text-muted-foreground">{selectedTemplate.language_code} · Requiere aprobación de Meta. El envío no permite editar el texto.</p></div> : null}
              <div className="flex items-end gap-1.5 sm:gap-2">
                <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 md:h-10 md:w-10" title="Adjuntar archivo" onClick={() => fileInputRef.current?.click()} disabled={selected.status === 'resolved' || selected.status === 'spam' || sending || isRecorderActive || !!selectedTemplate}><Paperclip className="h-5 w-5 md:h-4 md:w-4" /></Button>
                {!isRecorderActive ? (
                  <Textarea
                    aria-label="Escribir una respuesta"
                    rows={1}
                    value={draft}
                    onFocus={() => void markConversationRead(selected.id)}
                    onChange={(event) => { setDraft(event.target.value); setTemplateIndex(0); setDismissTemplates(false) }}
                    aria-controls={showTemplates ? 'chat-template-list' : undefined}
                    aria-expanded={!!showTemplates}
                    aria-activedescendant={showTemplates && matchingTemplates[templateIndex] ? `chat-template-${templateIndex}` : undefined}
                    onKeyDown={(event) => {
                      if (event.nativeEvent.isComposing) return
                      if (showTemplates && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
                        event.preventDefault()
                        if (event.key === 'Escape') setDismissTemplates(true)
                        else if (event.key === 'ArrowDown') setTemplateIndex(index => Math.min(index + 1, Math.max(0, matchingTemplates.length - 1)))
                        else if (event.key === 'ArrowUp') setTemplateIndex(index => Math.max(0, index - 1))
                        else if (matchingTemplates[templateIndex] && files.length === 0) chooseTemplate(matchingTemplates[templateIndex])
                        return
                      }
                      if (event.key === 'Enter' && !event.shiftKey && !isMobile) { event.preventDefault(); void sendReply() } }}
                    onPaste={(event) => {
                      const imageFiles = Array.from(event.clipboardData?.items ?? [])
                        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
                        .map((item) => item.getAsFile())
                        .filter((file): file is File => !!file)
                      if (imageFiles.length === 0) return
                      event.preventDefault()
                      void addFiles(imageFiles)
                    }}
                    placeholder={selected.status === 'resolved' ? 'La conversación está resuelta' : selected.channel === 'whatsapp' ? 'Escribí un mensaje o / para plantillas…' : 'Escribí una respuesta…'}
                    disabled={selected.status === 'resolved' || selected.status === 'spam' || sending || !!selectedTemplate}
                    className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl md:min-h-10"
                  />
                ) : null}
                {!isRecorderActive && (selectedTemplate || draft.trim() || files.length > 0) ? (
                  <Button size="icon" className="h-11 w-11 shrink-0 rounded-full md:h-10 md:w-10" title={sending ? 'Enviando…' : 'Enviar'} onClick={() => void sendReply()} disabled={(!selectedTemplate && !draft.trim() && files.length === 0) || !!showTemplates || sending || selected.status === 'resolved' || selected.status === 'spam'}><Send className="h-5 w-5 md:h-4 md:w-4" /></Button>
                ) : selected.channel === 'whatsapp' ? (
                  <AudioRecorderButton
                    onSend={handleSendVoiceNote}
                    onActiveChange={setIsRecorderActive}
                    disabled={selected.status === 'resolved' || selected.status === 'spam' || sending}
                  />
                ) : null}
              </div>
              <ComposerAttachmentTray files={files} onRemove={removeFile} />
              <p className={cn('mt-1 text-xs text-muted-foreground', sending ? 'block' : 'hidden md:block')}>{sending ? 'Enviando… El mensaje aparecerá cuando quede guardado.' : 'Enter para enviar · Shift + Enter para salto de línea · arrastrá o pegá archivos para adjuntar'}</p>
            </div>
          </>}</main>

        <aside className="inbox-details hidden min-h-0 overflow-y-auto border-l p-5 2xl:block">
          {detailsPanel ?? <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground"><UserRound className="h-7 w-7" strokeWidth={1.5} /><p className="text-sm">Los datos del contacto y su caso aparecerán acá.</p></div>}
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

      {lightboxIndex !== null && mediaItems[lightboxIndex] ? (
        <MediaLightbox
          items={mediaItems}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          linkedClientId={selected?.linked_client_id ?? null}
          linkedCaseId={selected?.linked_case_id ?? null}
        />
      ) : null}
    </div>
  )
}
