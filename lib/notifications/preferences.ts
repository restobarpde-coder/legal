import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationTypeId } from './catalog'

/**
 * Quita de la lista a quienes apagaron ese tipo de notificación.
 *
 * Es el equivalente TS de la compuerta `create_notification()` de la base, para
 * los caminos que insertan en lote (inbox). Requiere un cliente con permisos de
 * lectura sobre todas las filas: en la práctica, el service-role.
 */
export async function filterByNotificationPreference(
  supabase: SupabaseClient,
  userIds: string[],
  type: NotificationTypeId,
): Promise<string[]> {
  if (userIds.length === 0) return []

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('user_id')
    .eq('type', type)
    .eq('enabled', false)
    .in('user_id', userIds)

  // Si la consulta falla se notifica igual: perder un aviso de un caso es peor
  // que mostrarle uno de más a quien lo había silenciado.
  if (error) return userIds

  const optedOut = new Set((data ?? []).map(row => row.user_id as string))
  return userIds.filter(userId => !optedOut.has(userId))
}
