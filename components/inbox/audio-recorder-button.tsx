'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Send, Square, Trash2 } from 'lucide-react'
import { createAudioContext } from '@/lib/inbox/audio-context'

type State = 'idle' | 'recording' | 'review'

type Props = {
  onSend: (file: File) => void
  onActiveChange?: (active: boolean) => void
  disabled?: boolean
}

const BAR_COUNT = 27
const LONG_RECORDING_WARNING_SECONDS = 600

function pickMimeType() {
  if (typeof window === 'undefined' || !window.MediaRecorder) return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  return candidates.find((candidate) => MediaRecorder.isTypeSupported?.(candidate)) ?? ''
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AudioRecorderButton({ onSend, onActiveChange, disabled }: Props) {
  const [supported, setSupported] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [seconds, setSeconds] = useState(0)
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.15))
  const [error, setError] = useState<string | null>(null)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const mimeTypeRef = useRef('')
  const reviewUrlRef = useRef<string | null>(null)

  // Feature-detect solo en el cliente: evita un mismatch de hidratación entre
  // el render de servidor (sin `window`) y el del navegador.
  useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined')
  }, [])

  useEffect(() => { onActiveChange?.(state !== 'idle') }, [state, onActiveChange])

  const cleanupStream = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    void audioContextRef.current?.close()
    audioContextRef.current = null
    analyserRef.current = null
  }, [])

  useEffect(() => { reviewUrlRef.current = reviewUrl }, [reviewUrl])

  useEffect(() => () => {
    cleanupStream()
    if (reviewUrlRef.current) URL.revokeObjectURL(reviewUrlRef.current)
  }, [cleanupStream])

  const tick = useCallback(() => {
    const analyser = analyserRef.current
    if (analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const value = (data[i] - 128) / 128
        sum += value * value
      }
      const rms = Math.sqrt(sum / data.length)
      setLevels((current) => [...current.slice(1), Math.min(1, Math.max(0.12, rms * 3.5))])
    }
    setSeconds((Date.now() - startedAtRef.current) / 1000)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  async function startRecording() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = createAudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const mimeType = pickMimeType()
      mimeTypeRef.current = mimeType
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'audio/webm' })
        setReviewUrl(URL.createObjectURL(blob))
        setState('review')
      }
      recorderRef.current = recorder
      recorder.start()

      startedAtRef.current = Date.now()
      setSeconds(0)
      setState('recording')
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      setError('No se pudo acceder al micrófono. Revisá los permisos del navegador.')
      cleanupStream()
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    cleanupStream()
  }

  function discard() {
    if (reviewUrl) URL.revokeObjectURL(reviewUrl)
    setReviewUrl(null)
    chunksRef.current = []
    setState('idle')
    setLevels(Array(BAR_COUNT).fill(0.15))
  }

  function send() {
    const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'audio/webm' })
    const extension = mimeTypeRef.current.includes('mp4') ? 'm4a' : mimeTypeRef.current.includes('ogg') ? 'ogg' : 'webm'
    const file = new File([blob], `nota-de-voz-${Date.now()}.${extension}`, { type: mimeTypeRef.current || 'audio/webm' })
    if (reviewUrl) URL.revokeObjectURL(reviewUrl)
    setReviewUrl(null)
    chunksRef.current = []
    setState('idle')
    onSend(file)
  }

  if (!supported) return null

  if (state === 'idle') {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => void startRecording()}
          disabled={disabled}
          aria-label="Grabar nota de voz"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted disabled:opacity-50 md:h-10 md:w-10"
        >
          <Mic className="h-5 w-5 md:h-4 md:w-4" />
        </button>
        {error ? (
          <p className="absolute bottom-full right-0 z-10 mb-1 w-56 rounded-md border bg-background p-2 text-xs text-destructive shadow-md">{error}</p>
        ) : null}
      </div>
    )
  }

  if (state === 'recording') {
    return (
      <div className="relative flex flex-1 items-center gap-2 rounded-2xl border bg-background px-3 py-1.5">
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-destructive" />
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{formatTime(seconds)}</span>
        <div className="flex h-6 flex-1 items-center gap-[2px] overflow-hidden">
          {levels.map((level, index) => (
            <span key={index} className="w-[2.5px] shrink-0 rounded-full bg-primary/80" style={{ height: `${Math.max(4, level * 22)}px` }} />
          ))}
        </div>
        <button type="button" onClick={discard} aria-label="Cancelar grabación" className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
          Cancelar
        </button>
        <button type="button" onClick={stopRecording} aria-label="Detener grabación" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
        {seconds >= LONG_RECORDING_WARNING_SECONDS ? (
          <p className="absolute bottom-full left-0 mb-1 text-[11px] text-muted-foreground">Nota larga — considerá enviarla como archivo.</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center gap-2 rounded-2xl border bg-background px-3 py-1.5">
      <audio src={reviewUrl ?? undefined} controls className="h-9 flex-1" />
      <button type="button" onClick={discard} aria-label="Descartar nota de voz" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted">
        <Trash2 className="h-4 w-4" />
      </button>
      <button type="button" onClick={send} aria-label="Enviar nota de voz" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
        <Send className="h-4 w-4" />
      </button>
    </div>
  )
}
