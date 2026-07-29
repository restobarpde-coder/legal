import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Herramientas disponibles para el agente
const tools = [
  {
    name: 'get_cases',
    description: 'Obtiene lista de casos, opcionalmente filtrados por cliente',
    input_schema: {
      type: 'object',
      properties: {
        client_id: {
          type: 'string',
          description: 'ID del cliente para filtrar (opcional)',
        },
        limit: {
          type: 'number',
          description: 'Número máximo de casos a retornar',
          default: 10,
        },
      },
      required: [],
    },
  },
  {
    name: 'get_case_details',
    description: 'Obtiene detalles completos de un caso incluyendo documentos, notas y tareas',
    input_schema: {
      type: 'object',
      properties: {
        case_id: {
          type: 'string',
          description: 'ID del caso',
        },
      },
      required: ['case_id'],
    },
  },
  {
    name: 'get_case_documents',
    description: 'Obtiene documentos asociados a un caso',
    input_schema: {
      type: 'object',
      properties: {
        case_id: {
          type: 'string',
          description: 'ID del caso',
        },
      },
      required: ['case_id'],
    },
  },
  {
    name: 'get_case_notes',
    description: 'Obtiene notas de un caso',
    input_schema: {
      type: 'object',
      properties: {
        case_id: {
          type: 'string',
          description: 'ID del caso',
        },
      },
      required: ['case_id'],
    },
  },
  {
    name: 'get_case_tasks',
    description: 'Obtiene tareas de un caso',
    input_schema: {
      type: 'object',
      properties: {
        case_id: {
          type: 'string',
          description: 'ID del caso',
        },
      },
      required: ['case_id'],
    },
  },
  {
    name: 'create_task',
    description: 'Crea una nueva tarea en un caso',
    input_schema: {
      type: 'object',
      properties: {
        case_id: {
          type: 'string',
          description: 'ID del caso',
        },
        title: {
          type: 'string',
          description: 'Título de la tarea',
        },
        description: {
          type: 'string',
          description: 'Descripción de la tarea',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Prioridad de la tarea',
        },
      },
      required: ['case_id', 'title'],
    },
  },
  {
    name: 'create_note',
    description: 'Crea una nueva nota en un caso',
    input_schema: {
      type: 'object',
      properties: {
        case_id: {
          type: 'string',
          description: 'ID del caso',
        },
        content: {
          type: 'string',
          description: 'Contenido de la nota',
        },
      },
      required: ['case_id', 'content'],
    },
  },
]

// Ejecutar herramientas
async function executeTool(
  toolName: string,
  toolInput: Record<string, any>,
  userId: string
): Promise<string> {
  try {
    switch (toolName) {
      case 'get_cases': {
        const { data, error } = await supabase
          .from('cases')
          .select('id, title, status, clients(name)')
          .eq('user_id', userId)
          .limit(toolInput.limit || 10)

        if (error) throw error
        return JSON.stringify(data || [])
      }

      case 'get_case_details': {
        const { data, error } = await supabase
          .from('cases')
          .select(`
            *,
            clients(name, email),
            documents(id, name, type),
            notes(id, content, created_at),
            tasks(id, title, status, priority)
          `)
          .eq('id', toolInput.case_id)
          .eq('user_id', userId)
          .single()

        if (error) throw error
        return JSON.stringify(data)
      }

      case 'get_case_documents': {
        const { data, error } = await supabase
          .from('documents')
          .select('id, name, type, size, created_at')
          .eq('case_id', toolInput.case_id)

        if (error) throw error
        return JSON.stringify(data || [])
      }

      case 'get_case_notes': {
        const { data, error } = await supabase
          .from('notes')
          .select('id, content, created_at, created_by')
          .eq('case_id', toolInput.case_id)
          .order('created_at', { ascending: false })

        if (error) throw error
        return JSON.stringify(data || [])
      }

      case 'get_case_tasks': {
        const { data, error } = await supabase
          .from('tasks')
          .select('id, title, description, status, priority, due_date')
          .eq('case_id', toolInput.case_id)
          .order('due_date', { ascending: true })

        if (error) throw error
        return JSON.stringify(data || [])
      }

      case 'create_task': {
        const { data, error } = await supabase
          .from('tasks')
          .insert([
            {
              case_id: toolInput.case_id,
              title: toolInput.title,
              description: toolInput.description || '',
              priority: toolInput.priority || 'medium',
              status: 'pending',
              created_by: userId,
            },
          ])
          .select()

        if (error) throw error
        return JSON.stringify({
          success: true,
          message: `Tarea "${toolInput.title}" creada exitosamente`,
          task: data?.[0],
        })
      }

      case 'create_note': {
        const { data, error } = await supabase
          .from('notes')
          .insert([
            {
              case_id: toolInput.case_id,
              content: toolInput.content,
              created_by: userId,
            },
          ])
          .select()

        if (error) throw error
        return JSON.stringify({
          success: true,
          message: 'Nota creada exitosamente',
          note: data?.[0],
        })
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` })
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error)
    return JSON.stringify({
      error: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { messages } = await request.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      )
    }

    // Agregar contexto del usuario al sistema
    const systemPrompt = `Eres un asistente legal inteligente que ayuda a los abogados con la gestión de casos.
Tienes acceso a una base de datos con información de casos, documentos, notas y tareas.
Tu objetivo es:
1. Responder preguntas sobre casos específicos
2. Analizar información y proporcionar insights
3. Sugerir acciones (crear tareas, añadir notas)
4. Mantener el contexto de la conversación

Siempre sé preciso, profesional y basado en datos reales de la base de datos.
Cuando sugieras crear una tarea o nota, hazlo solo si el usuario lo solicita explícitamente o si es claramente necesario.`

    let agentMessages = [...messages]
    let finalResponse = ''

    // Loop agentico: continuar hasta que el agente no llame más a herramientas
    for (let i = 0; i < 10; i++) {
      const response = await client.messages.create({
        model: 'gpt-4o-mini',
        max_tokens: 4096,
        system: systemPrompt,
        tools: tools as any,
        messages: agentMessages,
      })

      // Agregar respuesta del asistente a los mensajes
      agentMessages.push({
        role: 'assistant',
        content: response.content,
      })

      // Verificar si el agente llamó a herramientas
      const toolUses = response.content.filter((c) => c.type === 'tool_use')

      if (toolUses.length === 0) {
        // El agente terminó, extraer el texto final
        const textBlocks = response.content.filter((c) => c.type === 'text')
        finalResponse = textBlocks.map((c) => (c as any).text).join('\n')
        break
      }

      // Ejecutar herramientas
      const toolResults = []
      for (const toolUse of toolUses) {
        if (toolUse.type === 'tool_use') {
          const result = await executeTool(
            toolUse.name,
            toolUse.input as Record<string, any>,
            user.id
          )
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          })
        }
      }

      // Agregar resultados de herramientas al historial
      agentMessages.push({
        role: 'user',
        content: toolResults,
      })
    }

    return NextResponse.json({
      message: finalResponse,
      success: true,
    })
  } catch (error) {
    console.error('Error in agent API:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
