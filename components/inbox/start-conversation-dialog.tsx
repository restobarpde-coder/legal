'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConversationForm, type ConversationFormDefaults } from '@/components/inbox/conversation-form'

type Props = {
  trigger: ReactNode
  defaults?: ConversationFormDefaults
  linkedClientId?: string
  linkedCaseId?: string
  title?: string
}

// Dialog wrapper to start a WhatsApp/email conversation from anywhere
// (client profile, case detail). On success it navigates to the inbox with
// the new conversation preselected.
export function StartConversationDialog({ trigger, defaults, linkedClientId, linkedCaseId, title }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title ?? 'Nueva conversación'}</DialogTitle>
        </DialogHeader>
        <ConversationForm
          defaults={defaults}
          linkedClientId={linkedClientId}
          linkedCaseId={linkedCaseId}
          onCancel={() => setOpen(false)}
          onCreated={(conversationId) => {
            setOpen(false)
            router.push(`/dashboard/messages?conversation=${conversationId}`)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
