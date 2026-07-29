'use client'

import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { SaveToCaseDialog } from '@/components/inbox/save-to-case-dialog'

export type LightboxItem = {
  attachmentId: string
  kind: 'image' | 'video'
  url: string
  filename?: string
  senderName: string | null
  sentAt: string | null
}

type Props = {
  items: LightboxItem[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  linkedClientId: string | null
  linkedCaseId?: string | null
}

const SWIPE_THRESHOLD = 50

export function MediaLightbox({ items, index, onIndexChange, onClose, linkedClientId, linkedCaseId }: Props) {
  const item = items[index]
  const touchStartX = useRef<number | null>(null)

  const hasPrev = index > 0
  const hasNext = index < items.length - 1

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' && hasPrev) onIndexChange(index - 1)
      if (event.key === 'ArrowRight' && hasNext) onIndexChange(index + 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasPrev, hasNext, index, onIndexChange])

  if (!item) return null

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null) return
    const deltaX = event.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (deltaX > SWIPE_THRESHOLD && hasPrev) onIndexChange(index - 1)
    else if (deltaX < -SWIPE_THRESHOLD && hasNext) onIndexChange(index + 1)
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-screen max-h-screen w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-none bg-[#17140f] p-0 text-white sm:max-w-none"
      >
        <VisuallyHidden><DialogTitle>{item.filename ?? 'Adjunto'}</DialogTitle></VisuallyHidden>
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
          <a
            href={item.url}
            download={item.filename}
            aria-label="Descargar"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>

        <div
          className="relative flex flex-1 items-center justify-center overflow-hidden px-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {hasPrev ? (
            <button
              type="button"
              onClick={() => onIndexChange(index - 1)}
              aria-label="Anterior"
              className="absolute left-2 hidden h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}

          {item.kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element -- adjunto de mensajería servido por endpoint autenticado
            <img key={item.attachmentId} src={item.url} alt={item.filename ?? 'Imagen'} className="max-h-full max-w-full object-contain" />
          ) : (
            <video key={item.attachmentId} src={item.url} controls autoPlay className="max-h-full max-w-full" />
          )}

          {hasNext ? (
            <button
              type="button"
              onClick={() => onIndexChange(index + 1)}
              aria-label="Siguiente"
              className="absolute right-2 hidden h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <div className="space-y-2 px-4 pb-6 pt-3">
          <p className="text-xs text-white/70">
            {item.senderName ?? 'Sin nombre'}{item.sentAt ? ` · ${new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.sentAt))}` : ''}
          </p>
          {linkedClientId ? (
            <SaveToCaseDialog
              attachmentId={item.attachmentId}
              filename={item.filename}
              clientId={linkedClientId}
              preselectedCaseId={linkedCaseId}
              trigger={
                <button type="button" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs hover:bg-white/25">
                  + Guardar como documento del caso
                </button>
              }
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
