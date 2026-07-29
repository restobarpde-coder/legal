/**
 * RAG por Caso: Cada caso es una bóveda de información embeddeada
 * Soporta: documentos, notas, tareas, chats
 */

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface CaseEmbedding {
  id: string
  case_id: string
  source_type: 'document' | 'note' | 'task' | 'chat'
  source_id: string
  content: string
  embedding?: number[]
  created_at?: string
}

/**
 * Genera embedding para un texto
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('[RAG] Error generando embedding:', error)
    throw error
  }
}

/**
 * Embeddea y guarda contenido en la bóveda del caso
 */
export async function embedCaseContent(
  caseId: string,
  sourceType: 'document' | 'note' | 'task' | 'chat',
  sourceId: string,
  content: string
): Promise<CaseEmbedding | null> {
  try {
    console.log(`[RAG] Embeddeando ${sourceType} para caso ${caseId}`)

    // Limitar longitud para embedding
    const textToEmbed = content.substring(0, 8000)

    // Generar embedding
    const embedding = await generateEmbedding(textToEmbed)

    // Guardar en Supabase
    const { data, error } = await supabase
      .from('case_embeddings')
      .insert([
        {
          case_id: caseId,
          source_type: sourceType,
          source_id: sourceId,
          content: content,
          embedding: embedding,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('[RAG] Error guardando embedding:', error)
      return null
    }

    console.log('[RAG] ✅ Embedding guardado')
    return data
  } catch (error) {
    console.error('[RAG] Error en embedCaseContent:', error)
    return null
  }
}

/**
 * Busca contenido similar dentro de un caso (Vector Search)
 */
export async function searchCaseContext(
  caseId: string,
  query: string,
  limit: number = 5,
  threshold: number = 0.6
): Promise<CaseEmbedding[]> {
  try {
    console.log(`[RAG] Buscando contexto para: "${query}"`)

    // Generar embedding de la query
    const queryEmbedding = await generateEmbedding(query)

    // Buscar similares en el caso
    const { data, error } = await supabase.rpc('search_case_embeddings', {
      p_case_id: caseId,
      p_query_embedding: queryEmbedding,
      p_match_threshold: threshold,
      p_match_count: limit,
    })

    if (error) {
      console.error('[RAG] Error en vector search:', error)
      return []
    }

    console.log(`[RAG] ✅ ${data?.length || 0} resultados encontrados`)
    return data || []
  } catch (error) {
    console.error('[RAG] Error en searchCaseContext:', error)
    return []
  }
}

/**
 * Formatea resultados de búsqueda para el prompt del agente
 */
export function formatSearchResults(results: CaseEmbedding[]): string {
  if (results.length === 0) {
    return ''
  }

  const grouped = results.reduce(
    (acc, result) => {
      if (!acc[result.source_type]) {
        acc[result.source_type] = []
      }
      acc[result.source_type].push(result)
      return acc
    },
    {} as Record<string, CaseEmbedding[]>
  )

  let formatted = '📚 CONTEXTO RELEVANTE DEL CASO:\n\n'

  if (grouped.document?.length) {
    formatted += '📄 Documentos:\n'
    grouped.document.forEach((d) => {
      formatted += `  • ${d.content.substring(0, 150)}...\n`
    })
    formatted += '\n'
  }

  if (grouped.note?.length) {
    formatted += '📝 Notas:\n'
    grouped.note.forEach((n) => {
      formatted += `  • ${n.content.substring(0, 150)}...\n`
    })
    formatted += '\n'
  }

  if (grouped.task?.length) {
    formatted += '✅ Tareas:\n'
    grouped.task.forEach((t) => {
      formatted += `  • ${t.content.substring(0, 150)}...\n`
    })
    formatted += '\n'
  }

  if (grouped.chat?.length) {
    formatted += '💬 Chats anteriores:\n'
    grouped.chat.forEach((c) => {
      formatted += `  • ${c.content.substring(0, 150)}...\n`
    })
    formatted += '\n'
  }

  return formatted
}

/**
 * Obtiene todo el contexto de un caso (RAG completo)
 */
export async function getCaseRAGContext(
  caseId: string,
  query: string
): Promise<string> {
  try {
    const results = await searchCaseContext(caseId, query, 8, 0.5)
    return formatSearchResults(results)
  } catch (error) {
    console.error('[RAG] Error en getCaseRAGContext:', error)
    return ''
  }
}

/**
 * Limpia embeddings antiguos de un caso
 */
export async function cleanCaseEmbeddings(caseId: string): Promise<number> {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { error, count } = await supabase
      .from('case_embeddings')
      .delete()
      .eq('case_id', caseId)
      .lt('created_at', thirtyDaysAgo.toISOString())

    if (error) {
      console.error('[RAG] Error limpiando embeddings:', error)
      return 0
    }

    console.log('[RAG] ✅ Embeddings antiguos limpiados')
    return count || 0
  } catch (error) {
    console.error('[RAG] Error en cleanCaseEmbeddings:', error)
    return 0
  }
}
