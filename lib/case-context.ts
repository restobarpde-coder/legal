import { createClient } from '@/lib/supabase/server'
import { isDeclarationNote } from '@/lib/declarations'

/**
 * Representación normalizada de un caso, pensada para ser leída tanto por la UI
 * como por un modelo de lenguaje.
 *
 * Reglas de diseño:
 *  - Un caso es la unidad de contexto. El cliente es un atributo del caso, no al revés.
 *  - Todo lo producido trabajando (documentos, fotos, declaraciones, notas, tareas)
 *    cuelga del caso y se expone acá agrupado por tipo, no mezclado.
 *  - Los archivos se describen por metadatos; nunca se incluye el binario.
 *  - El texto largo (transcripciones, notas) se trunca con marca explícita para
 *    que el consumidor sepa que hay más y pueda pedirlo.
 */

export const CONTEXT_SCHEMA_VERSION = 1

/** Corte por defecto para textos largos, en caracteres. */
const DEFAULT_TEXT_LIMIT = 4000

export type CaseContextParty = {
  name: string
  lawyer: string | null
}

export type CaseContextPerson = {
  name: string
  email: string | null
  role: string
}

export type CaseContextTask = {
  title: string
  status: string
  priority: string
  due_date: string | null
  assignee: string | null
  created_at: string
}

export type CaseContextFile = {
  name: string
  kind: 'document' | 'photo' | 'audio'
  document_type: string | null
  mime_type: string | null
  size_bytes: number | null
  description: string | null
  created_at: string
}

export type CaseContextEntry = {
  title: string | null
  body: string
  truncated: boolean
  author: string | null
  created_at: string
}

export type CaseContext = {
  schema_version: number
  generated_at: string
  case: {
    id: string
    case_number: string | null
    title: string
    description: string | null
    status: string
    priority: string
    case_type: string | null
    court: string | null
    start_date: string | null
    end_date: string | null
    created_at: string
  }
  client: {
    id: string
    name: string
    company: string | null
    email: string | null
    phone: string | null
    address: string | null
    rut: string | null
    ci: string | null
  } | null
  counterparties: CaseContextParty[]
  team: CaseContextPerson[]
  tasks: CaseContextTask[]
  files: CaseContextFile[]
  notes: CaseContextEntry[]
  declarations: CaseContextEntry[]
  stats: {
    open_tasks: number
    total_tasks: number
    documents: number
    photos: number
    audios: number
    notes: number
    declarations: number
    hours_logged: number
  }
}

function truncate(text: string, limit: number) {
  const clean = text?.trim() ?? ''
  if (clean.length <= limit) return { body: clean, truncated: false }
  return { body: `${clean.slice(0, limit)}…`, truncated: true }
}

function classifyFile(mimeType: string | null, documentType: string | null): CaseContextFile['kind'] {
  if (documentType === 'audio' || mimeType?.startsWith('audio/')) return 'audio'
  if (mimeType?.startsWith('image/')) return 'photo'
  return 'document'
}

/**
 * Verifica que el usuario pueda leer el caso. Mismo criterio que el resto de la
 * API: miembro del caso, creador, abogado asignado o admin.
 */
async function assertCaseAccess(caseId: string, userId: string) {
  const supabase = await createClient()

  const { data: caseRow } = await supabase
    .from('cases')
    .select('created_by, assigned_lawyer')
    .eq('id', caseId)
    .is('deleted_at', null)
    .single()

  if (!caseRow) return false
  if (caseRow.created_by === userId || caseRow.assigned_lawyer === userId) return true

  const { data: membership } = await supabase
    .from('case_members')
    .select('id')
    .eq('case_id', caseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (membership) return true

  const { data: userRow } = await supabase.from('users').select('role').eq('id', userId).single()
  return userRow?.role === 'admin'
}

export async function buildCaseContext(
  caseId: string,
  userId: string,
  options: { textLimit?: number } = {}
): Promise<CaseContext | null> {
  const textLimit = options.textLimit ?? DEFAULT_TEXT_LIMIT

  if (!(await assertCaseAccess(caseId, userId))) {
    return null
  }

  const supabase = await createClient()

  const { data: caseRow } = await supabase
    .from('cases')
    .select(
      `id, case_number, title, description, status, priority, case_type, court_name,
       start_date, end_date, created_at,
       clients (id, name, company, email, phone, address, rut, ci),
       case_counterparties (name, lawyer),
       case_members (role, users:user_id (full_name, email))`
    )
    .eq('id', caseId)
    .single()

  if (!caseRow) return null

  const [tasksResult, documentsResult, notesResult, timeResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('title, status, priority, due_date, created_at, users:assigned_to (full_name)')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('documents')
      .select('name, document_type, mime_type, file_size, description, created_at')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('notes')
      .select('title, content, created_at, users:created_by (full_name)')
      .eq('case_id', caseId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('time_entries').select('hours').eq('case_id', caseId),
  ])

  const tasks: CaseContextTask[] = ((tasksResult.data ?? []) as any[]).map(task => ({
    title: task.title,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    assignee: task.users?.full_name ?? null,
    created_at: task.created_at,
  }))

  const files: CaseContextFile[] = ((documentsResult.data ?? []) as any[]).map(document => ({
    name: document.name,
    kind: classifyFile(document.mime_type, document.document_type),
    document_type: document.document_type,
    mime_type: document.mime_type,
    size_bytes: document.file_size,
    description: document.description,
    created_at: document.created_at,
  }))

  const allNotes = ((notesResult.data ?? []) as any[]).map(note => {
    const { body, truncated } = truncate(note.content, textLimit)
    return {
      isDeclaration: isDeclarationNote(note.content),
      entry: {
        title: note.title,
        body,
        truncated,
        author: note.users?.full_name ?? null,
        created_at: note.created_at,
      } satisfies CaseContextEntry,
    }
  })

  const notes = allNotes.filter(n => !n.isDeclaration).map(n => n.entry)
  const declarations = allNotes.filter(n => n.isDeclaration).map(n => n.entry)

  const client = Array.isArray(caseRow.clients) ? caseRow.clients[0] : caseRow.clients
  const hoursLogged = ((timeResult.data ?? []) as any[]).reduce(
    (sum, entry) => sum + Number(entry.hours ?? 0),
    0
  )

  return {
    schema_version: CONTEXT_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    case: {
      id: caseRow.id,
      case_number: caseRow.case_number,
      title: caseRow.title,
      description: caseRow.description,
      status: caseRow.status,
      priority: caseRow.priority,
      case_type: caseRow.case_type,
      court: caseRow.court_name,
      start_date: caseRow.start_date,
      end_date: caseRow.end_date,
      created_at: caseRow.created_at,
    },
    client: client
      ? {
          id: client.id,
          name: client.name,
          company: client.company,
          email: client.email,
          phone: client.phone,
          address: client.address,
          rut: client.rut,
          ci: client.ci,
        }
      : null,
    counterparties: ((caseRow.case_counterparties ?? []) as any[]).map(party => ({
      name: party.name,
      lawyer: party.lawyer,
    })),
    team: ((caseRow.case_members ?? []) as any[]).map(member => ({
      name: member.users?.full_name ?? 'Usuario',
      email: member.users?.email ?? null,
      role: member.role ?? 'member',
    })),
    tasks,
    files,
    notes,
    declarations,
    stats: {
      open_tasks: tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length,
      total_tasks: tasks.length,
      documents: files.filter(f => f.kind === 'document').length,
      photos: files.filter(f => f.kind === 'photo').length,
      audios: files.filter(f => f.kind === 'audio').length,
      notes: notes.length,
      declarations: declarations.length,
      hours_logged: Number(hoursLogged.toFixed(2)),
    },
  }
}

/**
 * Serializa el contexto a Markdown con encabezados estables. El orden va de lo
 * más identificatorio a lo más voluminoso, para que truncar por el final siga
 * dejando un contexto útil.
 */
export function serializeCaseContext(context: CaseContext): string {
  const lines: string[] = []
  const section = (title: string) => lines.push('', `## ${title}`, '')
  const field = (label: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return
    lines.push(`- **${label}:** ${value}`)
  }

  lines.push(`# Caso: ${context.case.title}`)
  field('Número', context.case.case_number)
  field('Estado', context.case.status)
  field('Prioridad', context.case.priority)
  field('Tipo', context.case.case_type)
  field('Tribunal', context.case.court)
  field('Inicio', context.case.start_date)
  field('Fin', context.case.end_date)
  if (context.case.description) {
    lines.push('', context.case.description)
  }

  if (context.client) {
    section('Cliente')
    field('Nombre', context.client.name)
    field('Empresa', context.client.company)
    field('Email', context.client.email)
    field('Teléfono', context.client.phone)
    field('RUT', context.client.rut)
    field('CI', context.client.ci)
  }

  if (context.counterparties.length > 0) {
    section('Contrapartes')
    for (const party of context.counterparties) {
      lines.push(`- ${party.name}${party.lawyer ? ` (abogado: ${party.lawyer})` : ''}`)
    }
  }

  if (context.team.length > 0) {
    section('Equipo')
    for (const person of context.team) {
      lines.push(`- ${person.name} — ${person.role}`)
    }
  }

  if (context.tasks.length > 0) {
    section(`Tareas (${context.stats.open_tasks} abiertas de ${context.stats.total_tasks})`)
    for (const task of context.tasks) {
      const parts = [task.status, task.priority]
      if (task.due_date) parts.push(`vence ${task.due_date.slice(0, 10)}`)
      if (task.assignee) parts.push(task.assignee)
      lines.push(`- ${task.title} — ${parts.join(' · ')}`)
    }
  }

  if (context.declarations.length > 0) {
    section(`Declaraciones (${context.declarations.length})`)
    for (const declaration of context.declarations) {
      lines.push(`### Declaración del ${declaration.created_at.slice(0, 10)}`, '')
      lines.push(declaration.body)
      if (declaration.truncated) lines.push('', '_[texto truncado]_')
      lines.push('')
    }
  }

  if (context.notes.length > 0) {
    section(`Notas (${context.notes.length})`)
    for (const note of context.notes) {
      const heading = note.title || `Nota del ${note.created_at.slice(0, 10)}`
      lines.push(`### ${heading}`, '')
      lines.push(note.body)
      if (note.truncated) lines.push('', '_[texto truncado]_')
      lines.push('')
    }
  }

  if (context.files.length > 0) {
    section(
      `Archivos (${context.stats.documents} documentos, ${context.stats.photos} fotos, ${context.stats.audios} audios)`
    )
    for (const file of context.files) {
      const details = [file.kind, file.mime_type, file.created_at.slice(0, 10)]
        .filter(Boolean)
        .join(' · ')
      lines.push(`- ${file.name} — ${details}${file.description ? ` — ${file.description}` : ''}`)
    }
  }

  return lines.join('\n').trim()
}
