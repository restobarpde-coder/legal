'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createAudioContext } from '@/lib/inbox/audio-context'

const PEAK_COUNT = 40

type Props = {
  src: string
  outbound: boolean
  durationHint?: number
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

async function extractPeaks(src: string, signal: AbortSignal): Promise<{ peaks: number[]; duration: number }> {
  const response = await fetch(src, { signal })
  if (!response.ok) throw new Error('No se pudo descargar el audio')
  const arrayBuffer = await response.arrayBuffer()
  const audioContext = createAudioContext()
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const channel = audioBuffer.getChannelData(0)
    const bucketSize = Math.max(1, Math.floor(channel.length / PEAK_COUNT))
    const peaks: number[] = []
    for (let i = 0; i < PEAK_COUNT; i++) {
      const start = i * bucketSize
      let max = 0
      for (let j = start; j < start + bucketSize && j < channel.length; j++) {
        const value = Math.abs(channel[j])
        if (value > max) max = value
      }
      peaks.push(max)
    }
    const peakMax = Math.max(...peaks, 0.01)
    return { peaks: peaks.map((p) => Math.max(0.12, p / peakMax)), duration: audioBuffer.duration }
  } finally {
    void audioContext.close()
  }
}

export function AudioWavePlayer({ src, outbound, durationHint }: Props) {
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [duration, setDuration] = useState(durationHint ?? 0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    extractPeaks(src, controller.signal)
      .then(({ peaks: extracted, duration: extractedDuration }) => {
        setPeaks(extracted)
        setDuration(extractedDuration)
        setStatus('ready')
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setStatus('error')
      })
    return () => controller.abort()
  }, [src])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }, [])

  const seekTo = useCallback((fraction: number) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    audio.currentTime = fraction * duration
  }, [duration])

  if (status === 'error') {
    return (
      <div className="min-w-[190px]">
        <audio src={src} controls className="h-9 w-full" preload="none" />
      </div>
    )
  }

  const progress = duration > 0 ? currentTime / duration : 0

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-2xl px-3 py-2',
        outbound ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm border bg-background'
      )}
      style={{ minWidth: 200 }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration)
        }}
        className="hidden"
      />
      <button
        type="button"
        onClick={togglePlay}
        disabled={status === 'loading'}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        className={cn(
          'grid h-7 w-7 shrink-0 place-items-center rounded-full transition',
          outbound ? 'bg-white/25 hover:bg-white/35' : 'bg-muted hover:bg-muted/70'
        )}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
      </button>

      <button
        type="button"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          seekTo(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)))
        }}
        aria-label="Buscar en el audio"
        className="flex h-5 flex-1 items-center gap-[2px]"
      >
        {(peaks ?? Array.from({ length: PEAK_COUNT }, () => 0.25)).map((peak, index) => {
          const played = peaks && duration > 0 ? index / PEAK_COUNT <= progress : false
          return (
            <span
              key={index}
              className={cn('w-[2.5px] shrink-0 rounded-full transition-opacity', outbound ? 'bg-white' : 'bg-primary', played ? 'opacity-100' : 'opacity-45')}
              style={{ height: `${Math.max(4, peak * 20)}px` }}
            />
          )
        })}
      </button>

      <span className="shrink-0 text-[11px] tabular-nums opacity-80">
        {formatTime(playing || currentTime > 0 ? currentTime : duration)}
      </span>
    </div>
  )
}
