'use client'

import { AlertCircle, Check, CheckCheck, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MessageAttachment, type MessageAttachmentData } from '@/components/inbox/message-attachment'

export type InboxMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  content: string | null
  content_type: 'text' | 'image' | 'document' | 'audio' | 'video'
  wa_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | null
  attachments: MessageAttachmentData[] | null
  email_account?: { display_name?: string | null; email_address: string } | null
}

type Props = {
  message: InboxMessage
  channel: 'whatsapp' | 'email'
  timeLabel: string
  linkedClientId: string | null
  linkedCaseId?: string | null
  onOpenLightbox?: (attachmentId: string) => void
}

function StatusIcon({ status }: { status: InboxMessage['wa_status'] }) {
  if (!status) return null
  if (status === 'failed') return <AlertCircle className="h-3 w-3 text-destructive" />
  if (status === 'pending') return <Clock className="h-3 w-3 opacity-70" />
  if (status === 'sent') return <Check className="h-3 w-3 opacity-70" />
  return <CheckCheck className={cn('h-3.5 w-3.5', status === 'read' ? 'text-sky-600 dark:text-sky-300' : 'opacity-70')} />
}

export function MessageBubble({ message, channel, timeLabel, linkedClientId, linkedCaseId, onOpenLightbox }: Props) {
  const outbound = message.direction === 'outbound'
  const attachments = message.attachments ?? []
  const hasAttachments = attachments.length > 0
  const hasText = !!message.content

  const meta = (
    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
      {message.wa_status === 'failed' ? <span>Error al enviar</span> : null}
      {timeLabel}
      {outbound ? <StatusIcon status={message.wa_status} /> : null}
    </div>
  )

  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-1', outbound ? 'items-end' : 'items-start')}>
      {attachments.map((attachment, index) => (
        <div key={attachment.attachmentId ?? index} className="max-w-[85%] md:max-w-[75%] lg:max-w-[65%]">
          <MessageAttachment
            attachment={attachment}
            contentType={message.content_type}
            outbound={outbound}
            linkedClientId={linkedClientId}
            linkedCaseId={linkedCaseId}
            onOpenLightbox={onOpenLightbox}
          />
        </div>
      ))}

      {hasText || !hasAttachments ? (
        <div
          className={cn(
            'max-w-[90%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[80%] lg:max-w-[75%]',
            channel === 'whatsapp' ? cn('inbox-bubble', outbound ? 'inbox-bubble-outbound rounded-tr-sm' : 'rounded-tl-sm') : outbound ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm border bg-background'
          )}
        >
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content || (!hasAttachments ? `[${message.content_type}]` : null)}</p>
          {channel === 'email' && message.email_account ? (
            <p className="mt-2 border-t border-current/15 pt-1 text-[10px] opacity-75">
              {outbound ? 'Enviado desde' : 'Recibido en'}: {message.email_account.display_name || message.email_account.email_address}
            </p>
          ) : null}
          {meta}
        </div>
      ) : (
        <div className="px-1 text-muted-foreground">{meta}</div>
      )}
    </div>
  )
}
