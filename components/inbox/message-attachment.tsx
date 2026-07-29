'use client'

import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/inbox/media-limits'
import { ImageAttachment } from '@/components/inbox/image-attachment'
import { VideoAttachment } from '@/components/inbox/video-attachment'
import { AudioWavePlayer } from '@/components/inbox/audio-wave-player'
import { SaveToCaseDialog } from '@/components/inbox/save-to-case-dialog'

export type MessageAttachmentData = {
  attachmentId?: string
  filename?: string
  type?: string
  mimeType?: string
  size?: number
}

type Props = {
  attachment: MessageAttachmentData
  contentType: 'text' | 'image' | 'document' | 'audio' | 'video'
  outbound: boolean
  linkedClientId: string | null
  linkedCaseId?: string | null
  onOpenLightbox?: (attachmentId: string) => void
}

function SaveToCaseChip({ attachment, linkedClientId, linkedCaseId }: Pick<Props, 'linkedClientId' | 'linkedCaseId'> & { attachment: MessageAttachmentData }) {
  if (!linkedClientId || !attachment.attachmentId) return null
  return (
    <SaveToCaseDialog
      attachmentId={attachment.attachmentId}
      filename={attachment.filename}
      clientId={linkedClientId}
      preselectedCaseId={linkedCaseId}
      trigger={
        <button type="button" className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground hover:bg-muted/70">
          + Guardar en caso
        </button>
      }
    />
  )
}

export function MessageAttachment({ attachment, contentType, outbound, linkedClientId, linkedCaseId, onOpenLightbox }: Props) {
  const url = attachment.attachmentId ? `/api/inbox/attachments/${attachment.attachmentId}` : null

  if (!url) {
    return (
      <div className="flex items-center gap-1.5 text-xs opacity-90">
        <FileText className="h-3.5 w-3.5" />
        {attachment.filename || attachment.type || 'Archivo adjunto'}
      </div>
    )
  }

  if (contentType === 'image') {
    return (
      <div>
        <ImageAttachment src={url} alt={attachment.filename ?? 'Imagen'} outbound={outbound} onOpen={() => onOpenLightbox?.(attachment.attachmentId!)} />
        <SaveToCaseChip attachment={attachment} linkedClientId={linkedClientId} linkedCaseId={linkedCaseId} />
      </div>
    )
  }

  if (contentType === 'video') {
    return (
      <div>
        <VideoAttachment src={url} outbound={outbound} onOpen={() => onOpenLightbox?.(attachment.attachmentId!)} />
        <SaveToCaseChip attachment={attachment} linkedClientId={linkedClientId} linkedCaseId={linkedCaseId} />
      </div>
    )
  }

  if (contentType === 'audio') {
    return (
      <div>
        <AudioWavePlayer src={url} outbound={outbound} />
        <SaveToCaseChip attachment={attachment} linkedClientId={linkedClientId} linkedCaseId={linkedCaseId} />
      </div>
    )
  }

  return (
    <div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          'flex items-center gap-2.5 rounded-2xl border px-3 py-2.5',
          outbound ? 'rounded-br-sm border-white/25 bg-primary/95' : 'rounded-bl-sm bg-background'
        )}
      >
        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', outbound ? 'bg-white/20' : 'bg-muted')}>
          <FileText className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{attachment.filename || 'Archivo adjunto'}</span>
          {attachment.size ? <span className="block text-[11px] opacity-70">{formatFileSize(attachment.size)}</span> : null}
        </span>
      </a>
      <SaveToCaseChip attachment={attachment} linkedClientId={linkedClientId} linkedCaseId={linkedCaseId} />
    </div>
  )
}
