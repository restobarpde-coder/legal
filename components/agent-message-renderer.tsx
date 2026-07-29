'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface ParsedMessage {
  type: 'cases' | 'tasks' | 'notes' | 'documents' | 'text' | 'error'
  data?: any
  text?: string
}

function parseAgentMessage(message: string): ParsedMessage {
  // Intenta parsear JSON
  try {
    const json = JSON.parse(message)

    if (json.cases && Array.isArray(json.cases)) {
      return { type: 'cases', data: json }
    }
    if (json.tasks && Array.isArray(json.tasks)) {
      return { type: 'tasks', data: json }
    }
    if (json.notes && Array.isArray(json.notes)) {
      return { type: 'notes', data: json }
    }
    if (json.documents && Array.isArray(json.documents)) {
      return { type: 'documents', data: json }
    }
    if (json.error) {
      return { type: 'error', data: json }
    }
  } catch (e) {
    // No es JSON, es texto plano
  }

  return { type: 'text', text: message }
}

function CasesRenderer({ data }: { data: any }) {
  const cases = data.cases || []

  if (cases.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay casos</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">
        {data.count} caso{data.count !== 1 ? 's' : ''} encontrado{data.count !== 1 ? 's' : ''}:
      </p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {cases.map((case_: any, idx: number) => (
          <Card key={case_.id || idx} className="p-3 bg-muted/50">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm">{case_.title}</h4>
                  <p className="text-xs text-muted-foreground">{case_.case_number}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {case_.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Prioridad:</span>
                  <p className="font-medium">{case_.priority}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium">{case_.case_type || '-'}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function TasksRenderer({ data }: { data: any }) {
  const tasks = data.tasks || []

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay tareas</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">
        {data.count} tarea{data.count !== 1 ? 's' : ''}:
      </p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {tasks.map((task: any, idx: number) => (
          <Card key={task.id || idx} className="p-3 bg-muted/50">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm">{task.title}</h4>
                <Badge
                  variant={task.status === 'completed' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {task.status}
                </Badge>
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground">{task.description}</p>
              )}
              <div className="flex gap-2 text-xs">
                <Badge variant="outline">{task.priority}</Badge>
                {task.due_date && <Badge variant="outline">{task.due_date}</Badge>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function NotesRenderer({ data }: { data: any }) {
  const notes = data.notes || []

  if (notes.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay notas</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">
        {data.count} nota{data.count !== 1 ? 's' : ''}:
      </p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {notes.map((note: any, idx: number) => (
          <Card key={note.id || idx} className="p-3 bg-muted/50">
            <div className="space-y-2">
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(note.created_at).toLocaleString()}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function DocumentsRenderer({ data }: { data: any }) {
  const documents = data.documents || []

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay documentos</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">
        {data.count} documento{data.count !== 1 ? 's' : ''}:
      </p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {documents.map((doc: any, idx: number) => (
          <Card key={doc.id || idx} className="p-3 bg-muted/50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{doc.name}</h4>
                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                  <Badge variant="outline">{doc.type}</Badge>
                  {doc.size && (
                    <span>
                      {(doc.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ErrorRenderer({ data }: { data: any }) {
  return (
    <Card className="p-3 bg-destructive/10 border-destructive/20">
      <p className="text-sm text-destructive font-medium">{data.error}</p>
      {data.details && (
        <p className="text-xs text-muted-foreground mt-2">{data.details}</p>
      )}
    </Card>
  )
}

export function AgentMessageRenderer({ message }: { message: string }) {
  const parsed = parseAgentMessage(message)

  switch (parsed.type) {
    case 'cases':
      return <CasesRenderer data={parsed.data} />
    case 'tasks':
      return <TasksRenderer data={parsed.data} />
    case 'notes':
      return <NotesRenderer data={parsed.data} />
    case 'documents':
      return <DocumentsRenderer data={parsed.data} />
    case 'error':
      return <ErrorRenderer data={parsed.data} />
    default:
      return <p className="text-sm whitespace-pre-wrap break-words">{parsed.text}</p>
  }
}
