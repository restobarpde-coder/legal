'use client'

import { useQueries } from '@tanstack/react-query'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CasePhoto = {
  id: string
  name: string
  created_at: string
}

/**
 * Las fotos son documentos con mime_type de imagen. El bucket es privado, así
 * que cada miniatura necesita su URL firmada; se piden en paralelo y se cachean
 * 25 min (la firma dura 30).
 */
export function CasePhotoGrid({
  photos,
  onOpen,
}: {
  photos: CasePhoto[]
  onOpen: (photoId: string) => void
}) {
  const results = useQueries({
    queries: photos.map(photo => ({
      queryKey: ['document-view-url', photo.id],
      queryFn: async () => {
        const response = await fetch(`/api/documents/${photo.id}/view`)
        if (!response.ok) throw new Error('No fue posible cargar la imagen')
        const data = await response.json()
        return data.viewUrl as string
      },
      staleTime: 25 * 60 * 1000,
      retry: 1,
    })),
  })

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo, index) => {
        const { data: url, isLoading, isError } = results[index] ?? {}

        return (
          <button
            key={photo.id}
            type="button"
            onClick={() => onOpen(photo.id)}
            className="group overflow-hidden rounded-lg border text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex aspect-square items-center justify-center bg-muted">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL firmada de Supabase Storage, no optimizable
                <img
                  src={url}
                  alt={photo.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <ImageIcon
                  className={cn(
                    'h-8 w-8 text-muted-foreground',
                    isLoading && 'animate-pulse',
                    isError && 'text-destructive'
                  )}
                />
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-xs font-medium">{photo.name}</p>
              <p className="text-[0.6875rem] text-muted-foreground">
                {new Date(photo.created_at).toLocaleDateString('es-ES')}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
