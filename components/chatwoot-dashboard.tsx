'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  MessageCircle
} from 'lucide-react'
import { toast } from 'sonner'

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

  // Cargar conversaciones
  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/chatwoot/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
        
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
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }, [])

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

  // Filtrar conversaciones
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchTerm || 
      conv.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.inbox_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Hace menos de 1 hora'
    if (diffHours < 24) return `Hace ${diffHours} horas`
    if (diffHours < 48) return 'Ayer'
    return date.toLocaleDateString()
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
    <div className="flex flex-col space-y-6">
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

      {/* Panel Principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conversaciones de Chatwoot</CardTitle>
              <CardDescription>
                Gestiona las conversaciones recibidas desde Chatwoot
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchConversations}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="conversations">Conversaciones</TabsTrigger>
              <TabsTrigger value="details" disabled={!selectedConversation}>
                Detalles {selectedConversation && `(${selectedConversation.contact_name})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conversations" className="mt-6">
              {/* Filtros y búsqueda */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, email o inbox..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  {['all', 'open', 'pending', 'resolved'].map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(status as any)}
                    >
                      {status === 'all' ? 'Todos' : 
                       status === 'open' ? 'Abiertos' :
                       status === 'pending' ? 'Pendientes' : 'Resueltos'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Lista de conversaciones */}
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Cargando conversaciones...</p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No se encontraron conversaciones</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <Card 
                      key={conversation.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedConversation?.id === conversation.id ? 'ring-2 ring-blue-500' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedConversation(conversation)
                        fetchMessages(conversation.id)
                        setActiveTab('details')
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{conversation.contact_name}</h4>
                              {getStatusBadge(conversation.status)}
                              {!conversation.is_processed && (
                                <Badge variant="outline" className="text-orange-600">
                                  Sin procesar
                                </Badge>
                              )}
                            </div>
                            
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {conversation.contact_email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {conversation.contact_email}
                                </div>
                              )}
                              {conversation.contact_phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {conversation.contact_phone}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {conversation.inbox_name} ({conversation.inbox_channel_type})
                              </div>
                              {conversation.assignee_name && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Asignado a: {conversation.assignee_name}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right text-sm text-muted-foreground">
                            <p>{formatDate(conversation.chatwoot_updated_at)}</p>
                            {conversation.message_count && (
                              <p className="mt-1">
                                {conversation.message_count} mensajes
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-6">
              {selectedConversation ? (
                <div className="space-y-6">
                  {/* Header de la conversación */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedConversation.contact_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(selectedConversation.status)}
                        <Badge variant="outline">{selectedConversation.inbox_name}</Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://app.chatwoot.com/app/accounts/1/conversations/${selectedConversation.chatwoot_id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver en Chatwoot
                      </Button>
                      
                      {!selectedConversation.is_processed && (
                        <Button
                          size="sm"
                          onClick={() => markAsProcessed(selectedConversation.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Marcar como Procesado
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Información del contacto */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Información del Contacto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div><strong>Nombre:</strong> {selectedConversation.contact_name}</div>
                      {selectedConversation.contact_email && (
                        <div><strong>Email:</strong> {selectedConversation.contact_email}</div>
                      )}
                      {selectedConversation.contact_phone && (
                        <div><strong>Teléfono:</strong> {selectedConversation.contact_phone}</div>
                      )}
                      {selectedConversation.contact_identifier && (
                        <div><strong>Identificador:</strong> {selectedConversation.contact_identifier}</div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Mensajes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Mensajes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {messages.length === 0 ? (
                        <p className="text-muted-foreground">No hay mensajes disponibles</p>
                      ) : (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {messages.map((message) => (
                            <div 
                              key={message.id}
                              className={`p-3 rounded-lg ${
                                message.message_type === 'incoming' 
                                  ? 'bg-muted ml-0 mr-12' 
                                  : 'bg-blue-50 ml-12 mr-0'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">
                                  {message.sender_name || (message.message_type === 'incoming' ? 'Cliente' : 'Agente')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(message.chatwoot_created_at)}
                                </span>
                              </div>
                              <p className="text-sm">{message.content}</p>
                              {message.attachments.length > 0 && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  📎 {message.attachments.length} archivo(s) adjunto(s)
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Selecciona una conversación para ver los detalles</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
