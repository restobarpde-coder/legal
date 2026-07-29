'use client'

import { useState } from 'react'
import { Play, VideoOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  src: string
  outbound: boolean
  onOpen: () => void
}

export function VideoAttachment({ src, outbound, onOpen }: Props) {
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div className={cn('flex h-[130px] w-[210px] max-w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed text-muted-foreground', outbound ? 'rounded-br-sm' : 'rounded-bl-sm')}>
        <VideoOff className="h-5 w-5" />
        <span className="text-xs">No se pudo cargar el video</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('relative block overflow-hidden rounded-2xl', outbound ? 'rounded-br-sm' : 'rounded-bl-sm')}
    >
      <video
        src={src}
        muted
        preload="metadata"
        onError={() => setBroken(true)}
        className="block h-[170px] w-[220px] max-w-full bg-black object-cover"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/20">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/85 text-black">
          <Play className="ml-0.5 h-5 w-5" />
        </span>
      </span>
    </button>
  )
}
