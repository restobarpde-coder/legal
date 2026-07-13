import { MessageSettings } from '@/components/message-settings'
import { requirePageRole } from '@/lib/authz-server'

export default async function MessageSettingsPage() {
  await requirePageRole('admin')
  return <MessageSettings />
}
