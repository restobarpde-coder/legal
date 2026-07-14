'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Mail, X } from 'lucide-react'
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

// Gmail-style floating compose widget, anchored bottom-right so the
// conversation list and thread stay visible/usable behind it. The form
// itself is shared with the client-profile / case-detail dialogs
// (components/inbox/conversation-form).
export function InboxComposer({ accounts, templates, loading, onCancel, onCreated }: Props) {
  const [minimized, setMinimized] = useState(false)

  return (
    <div className="fixed bottom-0 right-4 z-50 w-[calc(100vw-2rem)] max-w-md sm:right-6">
      <div className="flex flex-col overflow-hidden rounded-t-xl border border-b-0 bg-background shadow-2xl">
        <header
          className="flex cursor-pointer items-center justify-between gap-3 border-b bg-muted/60 px-4 py-2.5"
          onClick={() => setMinimized((current) => !current)}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <h2 className="truncate text-sm font-semibold">Nueva conversación</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={minimized ? 'Expandir' : 'Minimizar'}
              onClick={(event) => { event.stopPropagation(); setMinimized((current) => !current) }}
            >
              {minimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Cerrar"
              onClick={(event) => { event.stopPropagation(); onCancel() }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {minimized ? null : (
          <div className="max-h-[min(32rem,70vh)] overflow-y-auto p-4">
            <ConversationForm
              accounts={accounts}
              templates={templates}
              loading={loading}
              onCancel={onCancel}
              onCreated={onCreated}
            />
          </div>
        )}
      </div>
    </div>
  )
}
