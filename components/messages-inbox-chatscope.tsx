'use client'

import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChatContainer, Conversation, ConversationHeader, ConversationList, MainContainer, Message, MessageInput, MessageList, Search, Sidebar } from '@chatscope/chat-ui-kit-react'
import { Button } from '@/components/ui/button'
import { NewConversationDialog } from '@/components/new-conversation-dialog'

type ConversationItem = { id: string; channel: 'email' | 'whatsapp'; contact_name: string | null; contact_email: string | null; contact_phone: string | null; status: string; unread_count: number; last_message_preview: string | null; last_message_at: string | null }
type InboxMessage = { id: string; direction: 'inbound' | 'outbound'; content: string | null; content_type: string; sender_name: string | null; sent_at: string | null; created_at: string }

export function MessagesInboxChatScope() {
  const [items, setItems] = useState<ConversationItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [filter, setFilter] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const selected = useMemo(() => items.find(item => item.id === selectedId) ?? null, [items, selectedId])

  const loadConversations = useCallback(async () => {
    const response = await fetch('/api/inbox/conversations?channel=all&status=all&assigned=all')
    const result = await response.json()
    if (!response.ok) { setError(result.error ?? 'No fue posible cargar conversaciones'); return }
    setItems(result.conversations ?? [])
    setSelectedId(current => current && result.conversations?.some((item: ConversationItem) => item.id === current) ? current : result.conversations?.[0]?.id ?? null)
  }, [])
  const loadMessages = useCallback(async (id: string) => {
    const response = await fetch(`/api/inbox/conversations/${id}/messages`)
    const result = await response.json()
    if (response.ok) setMessages(result.messages ?? []); else setError(result.error ?? 'No fue posible cargar mensajes')
  }, [])
  useEffect(() => { void loadConversations() }, [loadConversations])
  useEffect(() => { if (selectedId) void loadMessages(selectedId); else setMessages([]) }, [selectedId, loadMessages])

  async function sendMessage(_html: string, text: string) {
    if (!selectedId || !text.trim()) return
    setSending(true); setError('')
    const response = await fetch(`/api/inbox/conversations/${selectedId}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text.trim() }) })
    const result = await response.json(); setSending(false)
    if (!response.ok) { setError(result.error ?? 'No fue posible enviar'); return }
    await Promise.all([loadMessages(selectedId), loadConversations()])
  }
  const visible = items.filter(item => `${item.contact_name ?? ''} ${item.contact_email ?? ''} ${item.contact_phone ?? ''}`.toLowerCase().includes(filter.toLowerCase()))

  return <div className="space-y-4"><div className="flex items-end justify-between"><div><h1 className="text-3xl font-bold tracking-tight">Mensajes</h1><p className="mt-1 text-sm text-muted-foreground">WhatsApp y email en una bandeja única.</p></div><NewConversationDialog onCreated={(id) => { void loadConversations(); setSelectedId(id) }} /></div><div className="h-[calc(100vh-11rem)] min-h-[600px] overflow-hidden rounded-xl border"><MainContainer responsive><Sidebar position="left" scrollable={false}><Search placeholder="Buscar contacto…" value={filter} onChange={value => setFilter(value)} onClearClick={() => setFilter('')} /><ConversationList>{visible.map(item => <Conversation key={item.id} name={item.contact_name || 'Sin nombre'} info={`${item.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} · ${item.last_message_preview || 'Sin mensajes'}`} lastActivityTime={item.last_message_at ? new Date(item.last_message_at).toLocaleDateString('es-UY') : ''} unreadCnt={item.unread_count} active={item.id === selectedId} onClick={() => setSelectedId(item.id)} />)}</ConversationList></Sidebar><ChatContainer>{selected ? <><ConversationHeader><ConversationHeader.Content userName={selected.contact_name || 'Sin nombre'} info={`${selected.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} · ${selected.contact_email || selected.contact_phone || 'Contacto'}`} /><ConversationHeader.Actions><Button variant="outline" size="sm" onClick={() => void loadConversations()}>Actualizar</Button></ConversationHeader.Actions></ConversationHeader><MessageList>{messages.map(message => <Message key={message.id} model={{ message: message.content || `[${message.content_type}]`, sentTime: new Date(message.sent_at || message.created_at).toLocaleString('es-UY'), sender: message.sender_name || undefined, direction: message.direction === 'outbound' ? 'outgoing' : 'incoming', position: 'single' }} />)}</MessageList><MessageInput placeholder={sending ? 'Enviando…' : 'Escribí una respuesta…'} disabled={sending || selected.status === 'resolved' || selected.status === 'spam'} sendButton onSend={sendMessage} /></> : <MessageList><Message model={{ message: 'Seleccioná una conversación o creá una nueva.', direction: 'incoming', position: 'single' }} /></MessageList>}</ChatContainer></MainContainer></div>{error ? <p className="text-sm text-destructive">{error}</p> : null}</div>
}
