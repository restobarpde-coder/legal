'use client'

import { useCallback, useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUpdateTask } from '@/hooks/use-tasks'
import { toast } from 'sonner'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import '@/styles/ios-calendar.css'

const locales = {
    'es': es,
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
})

const DnDCalendar = withDragAndDrop(Calendar)

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

interface CalendarEvent {
    id: string
    title: string
    start: Date
    end: Date
    resource: Task
}

interface IosCalendarProps {
    tasks: Task[]
    onTaskClick?: (task: Task) => void
    onDateClick?: (date: Date) => void
}

export function IosCalendar({ tasks, onTaskClick, onDateClick }: IosCalendarProps) {
    const updateTaskMutation = useUpdateTask()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [currentView, setCurrentView] = useState<View>('month')

    // Transform tasks to calendar events
    const events: CalendarEvent[] = useMemo(() => {
        return tasks
            .filter(task => task.due_date)
            .map(task => ({
                id: task.id,
                title: task.title,
                start: new Date(task.due_date!),
                end: new Date(task.due_date!),
                resource: task,
            }))
    }, [tasks])

    // Custom event style getter for app colors
    const eventStyleGetter = useCallback((event: any) => {
        const task = event.resource as Task
        let backgroundColor = 'hsl(16, 67%, 55%)' // App primary color (warm orange)

        switch (task.priority) {
            case 'urgent':
                backgroundColor = 'hsl(0, 72%, 51%)' // Destructive red
                break
            case 'high':
                backgroundColor = 'hsl(25, 95%, 53%)' // Bright orange
                break
            case 'medium':
                backgroundColor = 'hsl(45, 93%, 47%)' // Golden yellow
                break
            case 'low':
                backgroundColor = 'hsl(142, 71%, 45%)' // Green
                break
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '6px',
                opacity: 0.9,
                color: 'white',
                border: 'none',
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                padding: '2px 6px',
            }
        }
    }, [])

    // Handle event drop (drag and drop)
    const handleEventDrop = useCallback(async (data: any) => {
        const event = data.event as CalendarEvent
        const start = data.start as Date
        const task = event.resource

        // Preserve the original time when dragging to a new date
        const originalDate = new Date(task.due_date!)
        const newDate = new Date(start)
        newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0)

        try {
            await updateTaskMutation.mutateAsync({
                caseId: task.case_id,
                taskId: task.id,
                updates: { due_date: newDate.toISOString() }
            })
            toast.success('Fecha de tarea actualizada')
        } catch (error) {
            toast.error('Error al actualizar la fecha')
        }
    }, [updateTaskMutation])

    // Handle event selection (click)
    const handleSelectEvent = useCallback((event: any) => {
        const calEvent = event as CalendarEvent
        if (onTaskClick) {
            onTaskClick(calEvent.resource)
        }
    }, [onTaskClick])

    // Handle slot selection (click on empty date)
    const handleSelectSlot = useCallback((slotInfo: any) => {
        if (onDateClick) {
            onDateClick(slotInfo.start)
        }
    }, [onDateClick])

    // Custom messages in Spanish
    const messages = {
        allDay: 'Todo el día',
        previous: 'Anterior',
        next: 'Siguiente',
        today: 'Hoy',
        month: 'Mes',
        week: 'Semana',
        day: 'Día',
        agenda: 'Agenda',
        date: 'Fecha',
        time: 'Hora',
        event: 'Evento',
        noEventsInRange: 'No hay tareas en este rango.',
        showMore: (total: number) => `+ ${total} más`,
    }

    return (
        <Card className="ios-calendar-card">
            <CardHeader className="ios-calendar-header">
                <CardTitle className="ios-calendar-title">Calendario</CardTitle>
            </CardHeader>
            <CardContent className="ios-calendar-content">
                <DnDCalendar
                    localizer={localizer}
                    events={events}
                    startAccessor={(event: any) => event.start}
                    endAccessor={(event: any) => event.end}
                    style={{ height: 700 }}
                    date={currentDate}
                    view={currentView}
                    onNavigate={(date: Date) => setCurrentDate(date)}
                    onView={(view: View) => setCurrentView(view)}
                    eventPropGetter={eventStyleGetter}
                    onEventDrop={handleEventDrop}
                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}
                    selectable
                    resizable
                    messages={messages}
                    culture="es"
                    views={['month', 'week', 'day', 'agenda']}
                    step={30}
                    showMultiDayTimes
                    popup
                />
            </CardContent>
        </Card>
    )
}
