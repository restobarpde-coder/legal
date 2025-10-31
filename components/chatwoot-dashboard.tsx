'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  RefreshCw,
  ExternalLink,
  Mail,
  Phone,
  User,
  MessageCircle,
  Send,
  MoreVertical,
  Archive,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface ChatwootConversation {
  id: string
  chatwoot_id: number
  contact_name: string
  contact_email?: string
  contact_phone?: string
  contact_identifier?: string
  status: 'open' | 'resolved' | 'pending'
  inbox_name: string
  inbox_channel_type: string
  assignee_name?: string
  assignee_email?: string
  team_name?: string
  message_count?: number
  incoming_messages?: number
  outgoing_messages?: number
  last_message_at?: string
  chatwoot_created_at: string
  chatwoot_updated_at: string
  is_processed: boolean
  linked_client_id?: string
  linked_case_id?: string
  processing_notes?: string
}

interface ChatwootMessage {
  id: string
  chatwoot_id: number
  content: string
  message_type: 'incoming' | 'outgoing' | 'activity' | 'template'
  sender_name?: string
  sender_email?: string
  sender_type?: 'contact' | 'user'
  chatwoot_created_at: string
  attachments: any[]
}

export default function ChatwootDashboard() {
  const [activeTab, setActiveTab] = useState('conversations')
  const [conversations, setConversations] = useState<ChatwootConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ChatwootConversation | null>(null)
  const [messages, setMessages] = useState<ChatwootMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'pending' | 'resolved'>('all')
  const [stats, setStats] = useState({
    totalConversations: 0,
    openConversations: 0,
    unprocessedConversations: 0,
    todayConversations: 0
  })
  const [userInfo, setUserInfo] = useState<{
    isAdmin: boolean,
    syncEnabled: boolean,
    chatwootEmail: string
  } | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cargar conversaciones
  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/chatwoot/conversations')
      if (response.ok) {
        const data = await response.json()
        console.log('📦 Respuesta completa:', data)
        console.log('👀 Conversaciones recibidas:', data.conversations?.length || 0)
        console.log('📄 Primera conversación:', data.conversations?.[0])
        setConversations(data.conversations || [])
        
        // Guardar info del usuario
        setUserInfo({
          isAdmin: data.is_admin,
          syncEnabled: data.sync_enabled,
          chatwootEmail: data.chatwoot_email
        })
        
        // Calcular estadísticas
        const today = new Date().toISOString().split('T')[0]
        setStats({
          totalConversations: data.conversations.length,
          openConversations: data.conversations.filter((c: ChatwootConversation) => c.status === 'open').length,
          unprocessedConversations: data.conversations.filter((c: ChatwootConversation) => !c.is_processed).length,
          todayConversations: data.conversations.filter((c: ChatwootConversation) => 
            c.chatwoot_created_at.startsWith(today)
          ).length
        })
      } else {
        toast.error('Error cargando conversaciones')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar mensajes de una conversación
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chatwoot/conversations/${conversationId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
        // Scroll al final después de cargar mensajes
        setTimeout(() => scrollToBottom(), 100)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }, [])

  // Auto-scroll al final
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Enviar mensaje
  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return
    
    setSendingMessage(true)
    const messageToSend = newMessage
    setNewMessage('') // Limpiar inmediatamente para mejor UX
    
    try {
      const response = await fetch(
        `/api/chatwoot/conversations/${selectedConversation.chatwoot_id}/messages/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: messageToSend })
        }
      )
      
      if (response.ok) {
        // Recargar mensajes
        await fetchMessages(selectedConversation.id)
        inputRef.current?.focus()
      } else {
        const error = await response.json()
        setNewMessage(messageToSend) // Restaurar mensaje si falló
        toast.error('Error enviando mensaje', {
          description: error.error
        })
      }
    } catch (error) {
      console.error('Error:', error)
      setNewMessage(messageToSend) // Restaurar mensaje si falló
      toast.error('Error de conexión')
    } finally {
      setSendingMessage(false)
    }
  }

  // Marcar conversación como procesada
  const markAsProcessed = async (conversationId: string, notes?: string) => {
    try {
      const response = await fetch(`/api/chatwoot/conversations/${conversationId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })
      
      if (response.ok) {
        toast.success('Conversación marcada como procesada')
        fetchConversations()
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(prev => prev ? { ...prev, is_processed: true, processing_notes: notes } : null)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error procesando conversación')
    }
  }

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(fetchConversations, 30000) // Actualizar cada 30 segundos
    return () => clearInterval(interval)
  }, [fetchConversations])

  // Auto-actualizar mensajes cuando hay una conversación seleccionada
  useEffect(() => {
    if (!selectedConversation) return
    
    const interval = setInterval(() => {
      fetchMessages(selectedConversation.id)
    }, 10000) // Actualizar mensajes cada 10 segundos
    
    return () => clearInterval(interval)
  }, [selectedConversation, fetchMessages])

  // Filtrar conversaciones
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchTerm || 
      conv.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.inbox_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Formatear fecha para mensajes
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: es })
    }
    if (isYesterday(date)) {
      return `Ayer ${format(date, 'HH:mm', { locale: es })}`
    }
    return format(date, 'dd/MM/yyyy HH:mm', { locale: es })
  }

  // Formatear fecha para lista de conversaciones
  const formatConversationTime = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: es })
    }
    if (isYesterday(date)) {
      return 'Ayer'
    }
    return format(date, 'dd/MM/yy', { locale: es })
  }

  // Obtener iniciales para avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Abierto</Badge>
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>
      case 'resolved':
        return <Badge variant="default">Resuelto</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] space-y-6">
      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversaciones</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abiertas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.openConversations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Procesar</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unprocessedConversations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.todayConversations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Panel Principal - Layout tipo Chat */}
      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* Lista de Conversaciones - Izquierda */}
        <Card className="w-96 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-lg">Chat</CardTitle>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={fetchConversations}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            
            {/* Filtros */}
            <div className="flex gap-1 mt-2">
              {['all', 'open', 'pending', 'resolved'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(status as any)}
                  className="h-7 text-xs flex-1"
                >
                  {status === 'all' ? 'Todos' : 
                   status === 'open' ? 'Abiertos' :
                   status === 'pending' ? 'Pendientes' : 'Resueltos'}
                </Button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mb-2" />
                  <p className="text-sm">No hay conversaciones</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => {
                        setSelectedConversation(conversation)
                        fetchMessages(conversation.id)
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {getInitials(conversation.contact_name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {conversation.contact_name}
                            </h4>
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                              {formatConversationTime(conversation.chatwoot_updated_at)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {getStatusBadge(conversation.status)}
                            {!conversation.is_processed && (
                              <Badge variant="outline" className="text-xs h-5">
                                Nuevo
                              </Badge>
                            )}
                          </div>
                          
                          {conversation.message_count && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {conversation.message_count} mensajes
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Panel de Chat - Derecha */}
        <Card className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header del Chat */}
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(selectedConversation.contact_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{selectedConversation.contact_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedConversation.contact_email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {selectedConversation.contact_email}
                          </span>
                        )}
                        {getStatusBadge(selectedConversation.status)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`https://app.chatwoot.com/app/accounts/1/conversations/${selectedConversation.chatwoot_id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    
                    {!selectedConversation.is_processed && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markAsProcessed(selectedConversation.id)}
                        title="Marcar como procesado"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Mensajes */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-4">
                  <div className="py-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>No hay mensajes en esta conversación</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div 
                          key={message.id}
                          className={`flex ${
                            message.message_type === 'outgoing' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div className="flex items-end gap-2 max-w-[70%]">
                            {message.message_type === 'incoming' && (
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {getInitials(message.sender_name || selectedConversation.contact_name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            
                            <div
                              className={`rounded-2xl px-4 py-2 ${
                                message.message_type === 'outgoing'
                                  ? 'bg-blue-600 text-white rounded-br-sm'
                                  : 'bg-muted rounded-bl-sm'
                              }`}
                            >
                              {message.sender_name && message.message_type === 'outgoing' && (
                                <p className="text-xs opacity-80 mb-1">
                                  {message.sender_name}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                              {message.attachments.length > 0 && (
                                <div className="mt-2 text-xs opacity-80">
                                  📎 {message.attachments.length} archivo(s)
                                </div>
                              )}
                              <p className={`text-xs mt-1 ${
                                message.message_type === 'outgoing' ? 'text-blue-100' : 'text-muted-foreground'
                              }`}>
                                {formatMessageTime(message.chatwoot_created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Input de Mensaje */}
              <div className="border-t p-4">
                <div className="flex items-end gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    disabled={sendingMessage}
                    className="flex-1"
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                    size="icon"
                  >
                    {sendingMessage ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Presiona Enter para enviar
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">Selecciona una conversación</p>
                <p className="text-sm">Elige una conversación para comenzar a chatear</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
