'use client'

import { useEffect, useState } from 'react'
import { FileText, X } from 'lucide-react'
import { formatFileSize } from '@/lib/inbox/media-limits'

type Props = {
  files: File[]
  onRemove: (index: number) => void
}

export function ComposerAttachmentTray({ files, onRemove }: Props) {
  if (files.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((file, index) => (
        <FilePreviewChip key={`${file.name}-${file.size}-${index}`} file={file} onRemove={() => onRemove(index)} />
      ))}
    </div>
  )
}

function FilePreviewChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const isImage = file.type.startsWith('image/')

  useEffect(() => {
    if (!isImage) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, isImage])

  return (
    <div className="relative flex items-center gap-2 rounded-xl border bg-muted/40 py-1.5 pl-1.5 pr-3 text-xs">
      {isImage && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview local de un File aún no subido
        <img src={previewUrl} alt={file.name} className="h-8 w-8 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </span>
      )}
      <div className="max-w-[140px]">
        <p className="truncate font-medium">{file.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${file.name}`}
        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border bg-background text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
