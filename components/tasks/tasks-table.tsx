"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye, CheckCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface Task {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  estimated_hours: number | null
  matters?: {
    title: string
    matter_number: string
  }
  assigned_user?: {
    first_name: string
    last_name: string
  }
}

interface TasksTableProps {
  tasks: Task[]
  onTaskUpdated: () => void
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

export function TasksTable({ tasks, onTaskUpdated }: TasksTableProps) {
  const router = useRouter()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    setUpdatingId(taskId)
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update task")
      }

      toast({
        title: "Success",
        description: "Task status updated successfully",
      })

      onTaskUpdated()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete task")
      }

      toast({
        title: "Success",
        description: "Task deleted successfully",
      })

      onTaskUpdated()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      })
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No tasks found</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Matter</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Est. Hours</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.title}</TableCell>
              <TableCell>
                {task.matters ? (
                  <div className="text-sm">
                    <div className="font-medium">{task.matters.matter_number}</div>
                    <div className="text-muted-foreground">{task.matters.title}</div>
                  </div>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                {task.assigned_user ? `${task.assigned_user.first_name} ${task.assigned_user.last_name}` : "Unassigned"}
              </TableCell>
              <TableCell>
                <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                  {task.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>{task.priority}</Badge>
              </TableCell>
              <TableCell>{task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "-"}</TableCell>
              <TableCell>{task.estimated_hours ? `${task.estimated_hours}h` : "-"}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {task.status !== "completed" && (
                      <DropdownMenuItem
                        onClick={() => handleStatusUpdate(task.id, "completed")}
                        disabled={updatingId === task.id}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark Complete
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => router.push(`/dashboard/tasks/${task.id}`)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/dashboard/tasks/${task.id}/edit`)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
