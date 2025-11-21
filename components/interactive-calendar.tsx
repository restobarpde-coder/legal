'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUpdateTask } from '@/hooks/use-tasks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Task {
    id: string
    title: string
    description: string | null
    priority: 'low' | 'medium' | 'high' | 'urgent'
    status: string
    due_date: string | null
    case_id: string
    assigned_to: string | null
    created_by: string
}

interface InteractiveCalendarProps {
    tasks: Task[]
    onTaskClick?: (task: Task) => void
    onDateClick?: (date: Date) => void
}

export function InteractiveCalendar({ tasks, onTaskClick, onDateClick }: InteractiveCalendarProps) {
    const updateTaskMutation = useUpdateTask()
    const calendarRef = useRef<FullCalendar>(null)

    // Transform tasks to FullCalendar events
    const events = tasks
        .filter(task => task.due_date)
        .map(task => ({
            id: task.id,
            title: task.title,
            start: task.due_date!,
            backgroundColor: getPriorityColor(task.priority),
            borderColor: getPriorityColor(task.priority),
            extendedProps: {
                description: task.description,
                priority: task.priority,
                status: task.status,
                caseId: task.case_id,
                originalTask: task
            }
        }))

    function getPriorityColor(priority: string) {
        switch (priority) {
            case 'urgent': return '#ef4444' // red-500
            case 'high': return '#f97316' // orange-500
            case 'medium': return '#eab308' // yellow-500
            case 'low': return '#22c55e' // green-500
            default: return '#3b82f6' // blue-500
        }
    }

    const handleEventDrop = async (info: any) => {
        const task = info.event.extendedProps.originalTask
        const newDate = info.event.start.toISOString()

        try {
            await updateTaskMutation.mutateAsync({
                caseId: task.case_id,
                taskId: task.id,
                updates: { due_date: newDate }
            })
            toast.success('Fecha de tarea actualizada')
        } catch (error) {
            toast.error('Error al actualizar la fecha')
            info.revert()
        }
    }

    const handleEventClick = (info: any) => {
        const task = info.event.extendedProps.originalTask
        if (onTaskClick) {
            onTaskClick(task)
        }
    }

    const handleDateClick = (info: any) => {
        if (onDateClick) {
            onDateClick(info.date)
        }
    }

    return (
        <Card className="h-[800px] flex flex-col">
            <CardHeader className="py-4">
                <CardTitle>Calendario Interactivo</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4">
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    locale={esLocale}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    events={events}
                    editable={true}
                    droppable={true}
                    eventDrop={handleEventDrop}
                    eventClick={handleEventClick}
                    dateClick={handleDateClick}
                    height="100%"
                    slotMinTime="08:00:00"
                    slotMaxTime="20:00:00"
                    allDaySlot={true}
                    eventTimeFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                        meridiem: false
                    }}
                />
            </CardContent>
        </Card>
    )
}
