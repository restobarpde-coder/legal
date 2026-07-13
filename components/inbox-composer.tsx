'use client'

import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConversationForm, type InboxAccount, type InboxTemplate } from '@/components/inbox/conversation-form'

export type { InboxAccount }

type Props = {
  accounts: InboxAccount[]
  templates: InboxTemplate[]
  loading: boolean
  onCancel: () => void
  onCreated: (id: string) => void
}

// Full-page composer used inside the inbox. The form itself is shared with
// the client-profile / case-detail dialogs (components/inbox/conversation-form).
export function InboxComposer({ accounts, templates, loading, onCancel, onCreated }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Volver a la bandeja">
            <ArrowLeft />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Nueva conversación</h2>
            <p className="text-xs text-muted-foreground">Iniciá un contacto desde la bandeja del estudio</p>
          </div>
        </div>
        <Badge variant="secondary">Redacción</Badge>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-5">
        <div className="mx-auto max-w-2xl rounded-xl border bg-background p-5 shadow-sm">
          <ConversationForm
            accounts={accounts}
            templates={templates}
            loading={loading}
            onCancel={onCancel}
            onCreated={onCreated}
          />
        </div>
      </div>
    </div>
  )
}
