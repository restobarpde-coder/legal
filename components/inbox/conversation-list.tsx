'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Mail, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Conversation = {
  id: string
  channel: 'whatsapp' | 'email'
  status: string
  contact_name: string | null
  email_subject: string | null
  last_message_at: string | null
  last_message_preview: string | null
  linked_client_id: string | null
  linked_case_id: string | null
}

type Props = {
  clientId?: string
  caseId?: string
  /** with both ids, 'any' lists conversations linked to either */
  matchAny?: boolean
  emptyMessage?: string
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierta', pending: 'Pendiente', resolved: 'Resuelta', spam: 'Spam',
}

export function ConversationList({ clientId, caseId, matchAny, emptyMessage }: Props) {
  const params = new URLSearchParams({ status: 'all' })
  if (clientId) params.set('client_id', clientId)
  if (caseId) params.set('case_id', caseId)
  if (matchAny && clientId && caseId) params.set('match', 'any')

  const { data, isLoading } = useQuery({
    queryKey: ['linked-conversations', clientId ?? null, caseId ?? null, matchAny ?? false],
    queryFn: async () => {
      const response = await fetch(`/api/inbox/conversations?${params.toString()}`)
      if (!response.ok) throw new Error('No fue posible cargar las conversaciones')
      return response.json() as Promise<{ conversations: Conversation[] }>
    },
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando conversaciones…</p>

  const conversations = data?.conversations ?? []
  if (conversations.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage ?? 'Todavía no hay conversaciones vinculadas.'}</p>
  }

  return (
    <div className="space-y-2">
      {conversations.map(conversation => (
        <Link
          key={conversation.id}
          href={`/dashboard/messages?conversation=${conversation.id}`}
          className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
        >
          {conversation.channel === 'whatsapp'
            ? <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            : <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium">
                {conversation.email_subject || conversation.contact_name || 'Sin asunto'}
              </span>
              <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[conversation.status] ?? conversation.status}</Badge>
              {matchAny && caseId ? (
                <Badge variant="secondary" className="text-[10px]">
                  {conversation.linked_case_id === caseId ? 'Caso' : 'Cliente'}
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">{conversation.last_message_preview || '—'}</p>
          </div>
          {conversation.last_message_at ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {new Date(conversation.last_message_at).toLocaleDateString('es-UY')}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  )
}
