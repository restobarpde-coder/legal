import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AgentChatMessage {
  id?: string
  case_id?: string
  user_id: string
  role: 'user' | 'assistant'
  message: string
  data?: Record<string, any>
  created_at?: string
}

/**
 * Guarda un mensaje de chat en el historial
 */
export async function saveChatMessage(
  userId: string,
  role: 'user' | 'assistant',
  message: string,
  caseId?: string,
  data?: Record<string, any>
): Promise<AgentChatMessage | null> {
  try {
    console.log(`[HISTORY] Guardando mensaje: ${role}`)

    const { data: savedMessage, error } = await supabase
      .from('agent_chat_history')
      .insert([
        {
          user_id: userId,
          case_id: caseId,
          role,
          message,
          data: data || null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('[HISTORY] Error guardando mensaje:', error)
      return null
    }

    console.log('[HISTORY] ✅ Mensaje guardado')
    return savedMessage
  } catch (error) {
    console.error('[HISTORY] Error en saveChatMessage:', error)
    return null
  }
}

/**
 * Obtiene el historial reciente de un caso
 */
export async function getCaseContext(
  caseId: string,
  userId: string,
  limit: number = 5
): Promise<AgentChatMessage[]> {
  try {
    console.log(`[HISTORY] Recuperando contexto del caso ${caseId}`)

    const { data, error } = await supabase
      .from('agent_chat_history')
      .select('*')
      .eq('case_id', caseId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[HISTORY] Error recuperando contexto:', error)
      return []
    }

    // Invertir para que estén en orden cronológico (antiguo → nuevo)
    const messages = (data || []).reverse()
    console.log(`[HISTORY] ✅ ${messages.length} mensajes recuperados`)

    return messages
  } catch (error) {
    console.error('[HISTORY] Error en getCaseContext:', error)
    return []
  }
}

/**
 * Obtiene el historial general del usuario
 */
export async function getUserContext(
  userId: string,
  limit: number = 10
): Promise<AgentChatMessage[]> {
  try {
    console.log('[HISTORY] Recuperando contexto general del usuario')

    const { data, error } = await supabase
      .from('agent_chat_history')
      .select('*')
      .eq('user_id', userId)
      .is('case_id', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[HISTORY] Error recuperando contexto usuario:', error)
      return []
    }

    const messages = (data || []).reverse()
    console.log(`[HISTORY] ✅ ${messages.length} mensajes del usuario recuperados`)

    return messages
  } catch (error) {
    console.error('[HISTORY] Error en getUserContext:', error)
    return []
  }
}

/**
 * Formatea el historial para incluir en el prompt del agente
 */
export function formatContextForPrompt(messages: AgentChatMessage[]): string {
  if (messages.length === 0) {
    return ''
  }

  const formatted = messages
    .map((m) => {
      const role = m.role === 'user' ? '👤 Usuario' : '🤖 Agente'
      return `${role}: ${m.message}`
    })
    .join('\n\n')

  return `📋 CONTEXTO DE CHATS ANTERIORES:\n${formatted}\n\n`
}

/**
 * Limpia chats muy antiguos (más de 30 días)
 */
export async function cleanOldChats(userId: string): Promise<number> {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { error, count } = await supabase
      .from('agent_chat_history')
      .delete()
      .eq('user_id', userId)
      .lt('created_at', thirtyDaysAgo.toISOString())

    if (error) {
      console.error('[HISTORY] Error limpiando chats antiguos:', error)
      return 0
    }

    console.log('[HISTORY] ✅ Chats antiguos limpiados')
    return count || 0
  } catch (error) {
    console.error('[HISTORY] Error en cleanOldChats:', error)
    return 0
  }
}
