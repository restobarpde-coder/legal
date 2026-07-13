'use client'

import { Mail, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StartConversationDialog } from '@/components/inbox/start-conversation-dialog'
import { normalizePhoneUY } from '@/lib/phone'

type Props = {
  clientId: string
  clientName: string
  clientEmail?: string | null
  clientPhone?: string | null
}

// Quick actions on the client profile to open a linked conversation from the
// platform inbox (instead of mailto:/tel: device handoffs).
export function ClientMessageActions({ clientId, clientName, clientEmail, clientPhone }: Props) {
  const normalizedPhone = normalizePhoneUY(clientPhone)

  return (
    <>
      {clientEmail ? (
        <StartConversationDialog
          title={`Email a ${clientName}`}
          linkedClientId={clientId}
          defaults={{ channel: 'email', contact_name: clientName, contact_email: clientEmail, contact_phone: clientPhone ?? undefined }}
          trigger={
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
              <Mail className="h-4 w-4 mr-2" />
              Enviar Email
            </Button>
          }
        />
      ) : null}
      {normalizedPhone ? (
        <StartConversationDialog
          title={`WhatsApp a ${clientName}`}
          linkedClientId={clientId}
          defaults={{ channel: 'whatsapp', contact_name: clientName, contact_email: clientEmail ?? undefined, contact_phone: normalizedPhone.e164 }}
          trigger={
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
              <MessageCircle className="h-4 w-4 mr-2" />
              Enviar WhatsApp
            </Button>
          }
        />
      ) : null}
    </>
  )
}
