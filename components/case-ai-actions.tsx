'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bot, ClipboardCheck, ClipboardCopy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/**
 * Puente entre el caso y la capa de IA: abrir el chat ya scopeado a este caso,
 * o llevarse el contexto serializado para pegarlo en cualquier otra herramienta.
 */
export function CaseAiActions({ caseId }: { caseId: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'loading' | 'copied'>('idle')

  const handleCopyContext = async () => {
    setCopyState('loading')
    try {
      const response = await fetch(`/api/cases/${caseId}/context?format=md`)
      if (!response.ok) throw new Error('No fue posible generar el contexto')

      const markdown = await response.text()
      await navigator.clipboard.writeText(markdown)

      setCopyState('copied')
      toast.success('Contexto del caso copiado')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch (error) {
      setCopyState('idle')
      toast.error(error instanceof Error ? error.message : 'Error al copiar el contexto')
    }
  }

  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" className="w-full justify-start bg-transparent" asChild>
        <Link href={`/dashboard/chat-webhook?case=${caseId}`}>
          <Bot className="h-4 w-4 mr-2" />
          Preguntar a la AI
        </Link>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full justify-start bg-transparent"
        onClick={handleCopyContext}
        disabled={copyState === 'loading'}
      >
        {copyState === 'loading' ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : copyState === 'copied' ? (
          <ClipboardCheck className="h-4 w-4 mr-2" />
        ) : (
          <ClipboardCopy className="h-4 w-4 mr-2" />
        )}
        {copyState === 'copied' ? 'Copiado' : 'Copiar contexto'}
      </Button>
    </div>
  )
}
