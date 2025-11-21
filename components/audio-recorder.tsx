'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Mic, Square, Pause, Play, Loader2, FileAudio, FolderPlus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface AudioRecorderProps {
  onTranscriptionComplete?: (summary: string) => void
  cases?: Array<{ id: string; title: string; clients?: { name: string } | null }>
  clients?: Array<{ id: string; name: string; company: string | null }>
}

export function AudioRecorder({ onTranscriptionComplete, cases = [], clients = [] }: AudioRecorderProps) {
  const router = useRouter()
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [summary, setSummary] = useState<string>('')
  const [transcription, setTranscription] = useState<string>('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveAction, setSaveAction] = useState<'attach' | 'create'>('attach')
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [newCaseTitle, setNewCaseTitle] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  
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
        setTranscription(data.transcription || '')
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
    setTranscription('')
    setRecordingTime(0)
    setSelectedCaseId('')
    setSelectedClientId('')
    setNewCaseTitle('')
  }

  const handleSaveDeclaration = async () => {
    if (!summary) {
      toast.error('No hay declaración para guardar')
      return
    }

    if (!audioBlob) {
      toast.error('No hay audio para guardar')
      return
    }

    setIsSaving(true)
    
    try {
      // Create FormData to send both declaration data and audio file
      const formData = new FormData()
      formData.append('audio', audioBlob, 'declaracion.webm')
      formData.append('summary', summary)
      if (transcription) {
        formData.append('transcription', transcription)
      }

      if (saveAction === 'attach') {
        if (!selectedCaseId) {
          toast.error('Selecciona un caso')
          setIsSaving(false)
          return
        }

        formData.append('caseId', selectedCaseId)

        const response = await fetch('/api/declaration/attach', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (result.success) {
          toast.success('Declaración adjuntada al caso')
          setShowSaveDialog(false)
          router.push(`/dashboard/cases/${selectedCaseId}`)
        } else {
          throw new Error(result.message || 'Error al adjuntar')
        }
      } else {
        if (!selectedClientId || !newCaseTitle) {
          toast.error('Completa todos los campos')
          setIsSaving(false)
          return
        }

        formData.append('clientId', selectedClientId)
        formData.append('title', newCaseTitle)

        const response = await fetch('/api/declaration/create-case', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (result.success) {
          toast.success('Caso creado exitosamente')
          setShowSaveDialog(false)
          router.push(`/dashboard/cases/${result.caseId}`)
        } else {
          throw new Error(result.message || 'Error al crear caso')
        }
      }
    } catch (error) {
      console.error('Error saving declaration:', error)
      toast.error('Error al guardar la declaración')
    } finally {
      setIsSaving(false)
    }
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
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Resumen de la Declaración</h3>
              <div className="rounded-lg border bg-muted p-4">
                <p className="text-sm whitespace-pre-wrap">{summary}</p>
              </div>
            </div>

            {/* Save Actions */}
            <div className="flex gap-3">
              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <FolderPlus className="h-4 w-4" />
                    Adjuntar a Caso
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Guardar Declaración</DialogTitle>
                    <DialogDescription>
                      Adjunta la declaración a un caso existente o crea uno nuevo
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Action Selection */}
                    <div className="space-y-2">
                      <Label>Acción</Label>
                      <Select value={saveAction} onValueChange={(v) => setSaveAction(v as 'attach' | 'create')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="attach">Adjuntar a caso existente</SelectItem>
                          <SelectItem value="create">Crear nuevo caso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Attach to Existing Case */}
                    {saveAction === 'attach' && (
                      <div className="space-y-2">
                        <Label>Caso</Label>
                        <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar caso..." />
                          </SelectTrigger>
                          <SelectContent>
                            {cases.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No hay casos disponibles
                              </SelectItem>
                            ) : (
                              cases.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.title} {c.clients?.name && `- ${c.clients.name}`}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Create New Case */}
                    {saveAction === 'create' && (
                      <>
                        <div className="space-y-2">
                          <Label>Cliente</Label>
                          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar cliente..." />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.length === 0 ? (
                                <SelectItem value="none" disabled>
                                  No hay clientes disponibles
                                </SelectItem>
                              ) : (
                                clients.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name} {c.company && `(${c.company})`}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Título del Caso</Label>
                          <Input
                            placeholder="Ej: Declaración de incidente..."
                            value={newCaseTitle}
                            onChange={(e) => setNewCaseTitle(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {/* Save Button */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleSaveDeclaration}
                        disabled={isSaving}
                        className="flex-1"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          'Guardar'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowSaveDialog(false)}
                        disabled={isSaving}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
