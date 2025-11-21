'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, User } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Task } from '@/hooks/use-tasks'

interface KanbanCardProps {
    task: Task
    onClick?: (task: Task) => void
}

export function KanbanCard({ task, onClick }: KanbanCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            task,
        },
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'border-red-500 text-red-700 bg-red-50'
            case 'high': return 'border-orange-500 text-orange-700 bg-orange-50'
            case 'medium': return 'border-yellow-500 text-yellow-700 bg-yellow-50'
            case 'low': return 'border-green-500 text-green-700 bg-green-50'
            default: return 'border-gray-200'
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="mb-3 touch-none"
            onClick={() => onClick?.(task)}
        >
            <Card className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border-l-4 ${getPriorityColor(task.priority)}`}>
                <CardHeader className="p-3 pb-2 space-y-0">
                    <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
                            {task.title}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {task.description}
                        </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                        <div className="flex items-center gap-2">
                            {task.assigned_to && (
                                <div className="flex items-center gap-1" title="Asignado">
                                    <User className="h-3 w-3" />
                                </div>
                            )}
                            {task.due_date && (
                                <div className={`flex items-center gap-1 ${new Date(task.due_date) < new Date() ? 'text-red-500 font-medium' : ''}`}>
                                    <Clock className="h-3 w-3" />
                                    <span>{format(new Date(task.due_date), 'd MMM', { locale: es })}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
