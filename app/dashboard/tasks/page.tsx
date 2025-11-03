import { requireAuth } from "@/lib/auth"
import { TasksClient } from './tasks-client'

export default async function TasksPage() {
  const user = await requireAuth()
  return <TasksClient currentUserId={user.id} />
}
