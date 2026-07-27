import { ChatWebhookClient } from '@/components/chat-webhook-client'
import { requireAuth } from '@/lib/auth'
import { getCasesForSelection } from '@/lib/case-selection'

export default async function ChatWebhookPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>
}) {
  await requireAuth()

  const { case: caseId } = await searchParams
  const cases = await getCasesForSelection()

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI IMPO</h1>
        <p className="text-muted-foreground">
          Consultá sobre un caso: la AI recibe su expediente completo como contexto.
        </p>
      </div>
      <ChatWebhookClient cases={cases} defaultCaseId={caseId} />
    </div>
  )
}
