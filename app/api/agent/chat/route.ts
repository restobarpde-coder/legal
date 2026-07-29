import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { tavily } from '@tavily/core'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY })

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
  {
    name: 'search_web',
    description: 'Busca en internet información legal, jurisprudencia, precedentes y noticias legales',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Términos de búsqueda (ej: "jurisprudencia sobre...", "precedente legal...")',
        },
        include_domains: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dominios específicos a buscar (opcional, ej: ["judicialcr.poder-judicial.go.cr"])',
        },
      },
      required: ['query'],
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

      case 'search_web': {
        const results = await tavilyClient.search(toolInput.query, {
          topic: 'news',
          max_results: 5,
          include_domains: toolInput.include_domains,
        })

        return JSON.stringify({
          query: toolInput.query,
          results: results.results.map((r: any) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            source: r.source,
          })),
          total_results: results.results.length,
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
Tienes acceso a:
1. Base de datos con información de casos, documentos, notas y tareas
2. Web search para búsqueda de jurisprudencia, precedentes y normativa legal

Tu objetivo es:
1. Responder preguntas sobre casos específicos
2. Analizar información y proporcionar insights
3. Buscar información legal relevante en internet cuando sea necesario
4. Sugerir acciones (crear tareas, añadir notas)
5. Mantener el contexto de la conversación

Siempre sé preciso, profesional y basado en datos reales.
Usa web search para encontrar jurisprudencia, precedentes legales y normativa.
Cuando sugieras crear una tarea o nota, hazlo solo si el usuario lo solicita explícitamente o si es claramente necesario.`

    let agentMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]
    let finalResponse = ''

    // Loop agentico: continuar hasta que el agente no llame más a herramientas
    for (let i = 0; i < 10; i++) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4096,
        tools: tools.map((tool) => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.input_schema as Record<string, unknown>,
          },
        })),
        messages: agentMessages,
      })

      // Procesar respuesta
      const assistantMessage = response.choices[0].message
      const msgToAdd: OpenAI.ChatCompletionAssistantMessageParam = {
        role: 'assistant',
        content: assistantMessage.content,
      }
      if (assistantMessage.tool_calls) {
        msgToAdd.tool_calls = assistantMessage.tool_calls
      }
      agentMessages.push(msgToAdd)

      // Verificar si el agente llamó a herramientas
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        // El agente terminó
        finalResponse = assistantMessage.content || ''
        break
      }

      // Ejecutar herramientas
      const toolMessages: OpenAI.ChatCompletionToolMessageParam[] = []
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== 'function') continue

        const args = JSON.parse(toolCall.function.arguments)
        const result = await executeTool(
          toolCall.function.name,
          args,
          user.id
        )
        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })
      }

      // Agregar resultados de herramientas al historial
      agentMessages.push(...toolMessages)
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
