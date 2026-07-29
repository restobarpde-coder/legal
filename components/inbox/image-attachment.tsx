'use client'

import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  src: string
  alt: string
  outbound: boolean
  onOpen: () => void
}

export function ImageAttachment({ src, alt, outbound, onOpen }: Props) {
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div className={cn('flex h-[130px] w-[210px] max-w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed text-muted-foreground', outbound ? 'rounded-br-sm' : 'rounded-bl-sm')}>
        <ImageOff className="h-5 w-5" />
        <span className="text-xs">No se pudo cargar la imagen</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('block overflow-hidden rounded-2xl', outbound ? 'rounded-br-sm' : 'rounded-bl-sm')}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- adjuntos servidos por endpoint autenticado, no aptos para el optimizador de imágenes de Next */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setBroken(true)}
        className="block h-[170px] w-[220px] max-w-full object-cover"
      />
    </button>
  )
}
