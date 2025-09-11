import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { TasksClient } from './tasks-client'


export default async function TasksPage() {
  const supabase = await createClient()
  const user = await requireAuth()

  // Obtener todas las tareas con información relacionada
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(`
      *,
      cases (
        id,
        title,
        clients (name)
      ),
      assigned_user:users!tasks_assigned_to_fkey (
        full_name
      ),
      created_user:users!tasks_created_by_fkey (
        full_name
      )
    `)
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id},assigned_to.is.null`)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching tasks:", error)
  }

  return <TasksClient initialTasks={tasks || []} currentUserId={user.id} />
}
