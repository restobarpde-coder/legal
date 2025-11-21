'use client'

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { KanbanCard } from './kanban-card'
import { Task } from '@/hooks/use-tasks'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface KanbanColumnProps {
    id: string
    title: string
    tasks: Task[]
    onTaskClick?: (task: Task) => void
}

export function KanbanColumn({ id, title, tasks, onTaskClick }: KanbanColumnProps) {
    const { setNodeRef } = useDroppable({
        id: id,
    })

    const getStatusColor = (statusId: string) => {
        switch (statusId) {
            case 'pending': return 'bg-gray-100 text-gray-700'
            case 'in_progress': return 'bg-blue-100 text-blue-700'
            case 'completed': return 'bg-green-100 text-green-700'
            case 'cancelled': return 'bg-red-100 text-red-700'
            default: return 'bg-gray-100'
        }
    }

    return (
        <div className="flex flex-col h-full min-w-[280px] w-80 bg-muted/30 rounded-lg border p-2">
            <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    {title}
                </h3>
                <Badge variant="secondary" className={`${getStatusColor(id)} border-0`}>
                    {tasks.length}
                </Badge>
            </div>

            <ScrollArea className="flex-1">
                <div ref={setNodeRef} className="px-1 min-h-[150px]">
                    <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {tasks.map((task) => (
                            <KanbanCard
                                key={task.id}
                                task={task}
                                onClick={onTaskClick}
                            />
                        ))}
                    </SortableContext>
                </div>
            </ScrollArea>
        </div>
    )
}
