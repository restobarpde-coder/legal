'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Square, Pause, Play, Loader2, FileAudio } from 'lucide-react'
import { toast } from 'sonner'

interface AudioRecorderProps {
  onTranscriptionComplete?: (summary: string) => void
}

export function AudioRecorder({ onTranscriptionComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [summary, setSummary] = useState<string>('')
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording, isPaused])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)
      setSummary('')
      toast.success('Grabación iniciada')
    } catch (error) {
      console.error('Error accessing microphone:', error)
      toast.error('Error al acceder al micrófono', {
        description: 'Por favor, verifica los permisos del navegador.'
      })
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      toast.info('Grabación pausada')
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      toast.info('Grabación reanudada')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      toast.success('Grabación detenida')
    }
  }

  const sendToAPI = async () => {
    if (!audioBlob) {
      toast.error('No hay audio para procesar')
      return
    }

    setIsProcessing(true)
    
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'declaration.webm')

      const response = await fetch('/api/declaration', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Error al procesar el audio')
      }

      const data = await response.json()
      
      if (data.summary) {
        setSummary(data.summary)
        toast.success('Audio procesado exitosamente')
        
        if (onTranscriptionComplete) {
          onTranscriptionComplete(data.summary)
        }
      } else {
        throw new Error('No se recibió resumen del servidor')
      }
    } catch (error) {
      console.error('Error sending audio:', error)
      toast.error('Error al procesar el audio', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetRecording = () => {
    setAudioBlob(null)
    setSummary('')
    setRecordingTime(0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grabador de Declaraciones</CardTitle>
        <CardDescription>
          Graba audio de declaraciones y obtén un resumen automático
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recording Controls */}
        <div className="flex flex-col items-center gap-4">
          {/* Timer Display */}
          <div className="text-4xl font-mono font-bold">
            {formatTime(recordingTime)}
          </div>

          {/* Recording Status */}
          <div className="flex items-center gap-2">
            {isRecording && (
              <>
                <div className={`h-3 w-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
                <span className="text-sm font-medium">
                  {isPaused ? 'Pausado' : 'Grabando...'}
                </span>
              </>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            {!isRecording && !audioBlob && (
              <Button onClick={startRecording} size="lg" className="gap-2">
                <Mic className="h-5 w-5" />
                Iniciar Grabación
              </Button>
            )}

            {isRecording && (
              <>
                {!isPaused ? (
                  <Button onClick={pauseRecording} variant="outline" size="lg" className="gap-2">
                    <Pause className="h-5 w-5" />
                    Pausar
                  </Button>
                ) : (
                  <Button onClick={resumeRecording} variant="outline" size="lg" className="gap-2">
                    <Play className="h-5 w-5" />
                    Reanudar
                  </Button>
                )}
                <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
                  <Square className="h-5 w-5" />
                  Detener
                </Button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <Button onClick={sendToAPI} disabled={isProcessing} size="lg" className="gap-2">
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FileAudio className="h-5 w-5" />
                  )}
                  {isProcessing ? 'Procesando...' : 'Procesar Audio'}
                </Button>
                <Button onClick={resetRecording} variant="outline" size="lg">
                  Nueva Grabación
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Audio Preview */}
        {audioBlob && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Audio Grabado</h3>
            <audio 
              controls 
              src={URL.createObjectURL(audioBlob)} 
              className="w-full"
            />
          </div>
        )}

        {/* Summary Display */}
        {summary && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Resumen de la Declaración</h3>
            <div className="rounded-lg border bg-muted p-4">
              <p className="text-sm whitespace-pre-wrap">{summary}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
