import { requireAuth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { tavily } from '@tavily/core'
import { queryImpo } from '@/lib/impo-client'

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
  {
    name: 'search_impo',
    description: 'Busca normas jurídicas en el Banco de Datos de IMPO (Instituto de Mayoría de Edad de Uruguay). Consulta leyes, decretos, constitución, resoluciones, etc.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Consulta en lenguaje natural (ej: "ley 19889", "decreto 356/2018", "constitución artículo 72", "resolución ministerial")',
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
  console.log(`[AGENT] Ejecutando herramienta: ${toolName}`, { toolInput, userId })

  try {
    switch (toolName) {
      case 'get_cases': {
        console.log(`[AGENT] get_cases: buscando casos para usuario ${userId}`)

        const { data, error } = await supabase
          .from('cases')
          .select('id, title, status, case_number, priority, client_id')
          .eq('created_by', userId)
          .is('deleted_at', null)
          .limit(toolInput.limit || 10)

        if (error) {
          console.error(`[AGENT] Error en get_cases:`, error)
          throw error
        }

        console.log(`[AGENT] get_cases: encontrados ${data?.length || 0} casos`)
        return JSON.stringify({
          success: true,
          count: data?.length || 0,
          cases: data || [],
        })
      }

      case 'get_case_details': {
        console.log(`[AGENT] get_case_details: obteniendo caso ${toolInput.case_id}`)

        const { data, error } = await supabase
          .from('cases')
          .select('*')
          .eq('id', toolInput.case_id)
          .eq('created_by', userId)
          .is('deleted_at', null)
          .single()

        if (error) {
          console.error(`[AGENT] Error en get_case_details:`, error)
          throw error
        }

        console.log(`[AGENT] get_case_details: caso encontrado`)
        return JSON.stringify({
          success: true,
          case: data,
        })
      }

      case 'get_case_documents': {
        console.log(`[AGENT] get_case_documents: obteniendo docs del caso ${toolInput.case_id}`)

        // Verifica que el caso pertenece al usuario
        const { data: caseCheck } = await supabase
          .from('cases')
          .select('id')
          .eq('id', toolInput.case_id)
          .eq('created_by', userId)
          .single()

        if (!caseCheck) throw new Error('Case not found or unauthorized')

        const { data, error } = await supabase
          .from('documents')
          .select('id, name, type, size, created_at')
          .eq('case_id', toolInput.case_id)

        if (error) throw error
        return JSON.stringify({
          success: true,
          count: data?.length || 0,
          documents: data || [],
        })
      }

      case 'get_case_notes': {
        console.log(`[AGENT] get_case_notes: obteniendo notas del caso ${toolInput.case_id}`)

        // Verifica que el caso pertenece al usuario
        const { data: caseCheck } = await supabase
          .from('cases')
          .select('id')
          .eq('id', toolInput.case_id)
          .eq('created_by', userId)
          .single()

        if (!caseCheck) throw new Error('Case not found or unauthorized')

        const { data, error } = await supabase
          .from('notes')
          .select('id, content, created_at, created_by')
          .eq('case_id', toolInput.case_id)
          .order('created_at', { ascending: false })

        if (error) throw error
        return JSON.stringify({
          success: true,
          count: data?.length || 0,
          notes: data || [],
        })
      }

      case 'get_case_tasks': {
        console.log(`[AGENT] get_case_tasks: obteniendo tareas del caso ${toolInput.case_id}`)

        // Verifica que el caso pertenece al usuario
        const { data: caseCheck } = await supabase
          .from('cases')
          .select('id')
          .eq('id', toolInput.case_id)
          .eq('created_by', userId)
          .single()

        if (!caseCheck) throw new Error('Case not found or unauthorized')

        const { data, error } = await supabase
          .from('tasks')
          .select('id, title, description, status, priority, due_date')
          .eq('case_id', toolInput.case_id)
          .order('due_date', { ascending: true })

        if (error) throw error
        return JSON.stringify({
          success: true,
          count: data?.length || 0,
          tasks: data || [],
        })
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

      case 'search_impo': {
        console.log(`[AGENT] search_impo: buscando norma "${toolInput.query}"`)

        const norm = await queryImpo(toolInput.query)

        if (!norm) {
          return JSON.stringify({
            success: false,
            error: `No se encontró norma en IMPO para: ${toolInput.query}`,
            query: toolInput.query,
          })
        }

        console.log(`[AGENT] search_impo: norma encontrada`)
        return JSON.stringify({
          success: true,
          query: toolInput.query,
          norm: {
            id: norm.id,
            tipo: norm.tipo,
            numero: norm.numero,
            ano: norm.ano,
            titulo: norm.titulo,
            articulos_count: norm.articulos?.length || 0,
          },
          contenido: norm.contenido?.substring(0, 2000), // Primeros 2000 caracteres
          source: 'IMPO (fuente oficial)',
        })
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` })
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error(`[AGENT] ❌ Error executing tool ${toolName}:`, errorMsg)
    console.error(`[AGENT] Error details:`, error)
    return JSON.stringify({
      success: false,
      error: `Error executing tool: ${errorMsg}`,
      toolName,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[AGENT] 🤖 Iniciando request del agente')

    const user = await requireAuth()
    console.log(`[AGENT] ✅ Usuario autenticado: ${user.id}`)

    const { messages } = await request.json()
    console.log(`[AGENT] 📨 Mensajes recibidos: ${messages.length}`)

    if (!Array.isArray(messages) || messages.length === 0) {
      console.warn('[AGENT] ⚠️ No messages provided')
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      )
    }

    // Agregar contexto del usuario al sistema
    const systemPrompt = `Eres un asistente legal inteligente que ayuda a los abogados con la gestión de casos.

Tienes acceso a:
1. Base de datos: información de casos, documentos, notas y tareas
2. IMPO (Banco de Datos de Uruguay): leyes, decretos, constitución, resoluciones
3. Web search: jurisprudencia, precedentes, normativa y contexto general

Tu objetivo es:
1. Responder preguntas sobre casos específicos
2. Consultar normativa uruguaya en IMPO cuando sea relevante
3. Buscar información legal complementaria
4. Analizar y proporcionar insights
5. Sugerir acciones (crear tareas, añadir notas)

IMPORTANTE:
- Cuando el usuario pregunte sobre leyes, decretos, artículos o normas uruguayas, usa IMPO como fuente oficial
- IMPO es la fuente de verdad para normativa uruguaya (nunca inventes artículos ni normas)
- Usa web search para contexto, doctrina, casos prácticos, noticias
- Siempre aclara si la información viene de IMPO, web o análisis propio
- Cuando sugieras crear tareas o notas, hazlo solo si el usuario lo solicita explícitamente

Sé preciso, profesional y basado en datos reales.`

    let agentMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]
    let finalResponse = ''
    let lastToolResult: any = null

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

        // Guardar el último resultado para devolver datos estructurados
        try {
          const parsed = JSON.parse(result)
          if (parsed.cases || parsed.tasks || parsed.notes || parsed.documents) {
            lastToolResult = result
          }
        } catch (e) {
          // No es JSON estructurado, ignorar
        }

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })
      }

      // Agregar resultados de herramientas al historial
      agentMessages.push(...toolMessages)
    }

    console.log('[AGENT] ✅ Respuesta lista')

    // Si la última herramienta devolvió datos estructurados, enviarlos también
    const response: any = {
      message: finalResponse,
      success: true,
    }

    if (lastToolResult) {
      try {
        response.data = JSON.parse(lastToolResult)
      } catch (e) {
        // Ignorar si no es JSON válido
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('[AGENT] ❌ Error fatal en agent API:', errorMsg)
    console.error('[AGENT] Stack:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMsg,
      },
      { status: 500 }
    )
  }
}
