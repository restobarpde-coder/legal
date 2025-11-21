'use client'

import { useState, useMemo } from 'react'
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { Task, useUpdateTask } from '@/hooks/use-tasks'
import { toast } from 'sonner'

interface KanbanBoardProps {
    tasks: Task[]
    onTaskClick?: (task: Task) => void
}

const COLUMNS = [
    { id: 'pending', title: 'Pendiente' },
    { id: 'in_progress', title: 'En Progreso' },
    { id: 'completed', title: 'Completada' },
    { id: 'cancelled', title: 'Cancelada' },
]

export function KanbanBoard({ tasks, onTaskClick }: KanbanBoardProps) {
    const [activeTask, setActiveTask] = useState<Task | null>(null)
    const updateTaskMutation = useUpdateTask()

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Start dragging after 5px movement
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Group tasks by status
    const tasksByStatus = useMemo(() => {
        const grouped: Record<string, Task[]> = {
            pending: [],
            in_progress: [],
            completed: [],
            cancelled: [],
        }

        tasks.forEach(task => {
            if (grouped[task.status]) {
                grouped[task.status].push(task)
            } else {
                // Fallback for unknown statuses
                grouped['pending'].push(task)
            }
        })

        return grouped
    }, [tasks])

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const task = tasks.find(t => t.id === active.id)
        if (task) {
            setActiveTask(task)
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (!over) {
            setActiveTask(null)
            return
        }

        const activeId = active.id as string
        const overId = over.id as string

        const activeTask = tasks.find(t => t.id === activeId)
        if (!activeTask) return

        // Find the container (column) we dropped over
        // If overId is a column id, we dropped on the column
        // If overId is a task id, we dropped on a task, so find its status
        let newStatus = overId

        if (!COLUMNS.find(c => c.id === newStatus)) {
            const overTask = tasks.find(t => t.id === overId)
            if (overTask) {
                newStatus = overTask.status
            } else {
                // Should not happen if logic is correct
                setActiveTask(null)
                return
            }
        }

        if (activeTask.status !== newStatus) {
            try {
                // Optimistic update handled by React Query invalidation in hook
                await updateTaskMutation.mutateAsync({
                    caseId: activeTask.case_id,
                    taskId: activeTask.id,
                    updates: { status: newStatus }
                })
                toast.success(`Tarea movida a ${COLUMNS.find(c => c.id === newStatus)?.title}`)
            } catch (error) {
                toast.error('Error al actualizar el estado')
            }
        }

        setActiveTask(null)
    }

    return (
        <div className="h-full overflow-x-auto pb-4">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 h-full min-w-max p-1">
                    {COLUMNS.map((col) => (
                        <KanbanColumn
                            key={col.id}
                            id={col.id}
                            title={col.title}
                            tasks={tasksByStatus[col.id] || []}
                            onTaskClick={onTaskClick}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeTask ? <KanbanCard task={activeTask} /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    )
}
