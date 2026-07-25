-- ============================================================
-- Diagnóstico: ¿por qué la bandeja no se actualiza en vivo?
--
-- Script de solo lectura. No modifica nada: la PARTE B cambia
-- estado de sesión, pero dentro de una transacción que termina
-- en ROLLBACK.
--
-- Cómo correrlo: el editor de Supabase muestra solo el resultado
-- de la última sentencia, así que corré una parte por vez —
-- seleccionás el bloque con el mouse y apretás Run.
--
-- Orden de lectura: el primer renglón que diga MAL es la causa.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PARTE A — Chequeos estáticos (una sola tabla de veredictos)
-- ════════════════════════════════════════════════════════════

WITH publicadas AS (
  SELECT
    count(*) FILTER (WHERE tablename = 'inbox_messages')      AS mensajes,
    count(*) FILTER (WHERE tablename = 'inbox_conversations') AS conversaciones
  FROM pg_publication_tables
  WHERE pubname    = 'supabase_realtime'
    AND schemaname = 'public'
),
operaciones AS (
  SELECT pubinsert, pubupdate
  FROM pg_publication
  WHERE pubname = 'supabase_realtime'
),
identidad AS (
  SELECT count(*) AS sin_identidad
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('inbox_messages', 'inbox_conversations')
    AND c.relreplident = 'n'
),
permisos AS (
  SELECT count(DISTINCT table_name) AS con_select
  FROM information_schema.role_table_grants
  WHERE table_schema   = 'public'
    AND grantee        = 'authenticated'
    AND privilege_type = 'SELECT'
    AND table_name IN ('inbox_messages', 'inbox_conversations')
),
policies AS (
  SELECT
    count(*) FILTER (WHERE tablename = 'inbox_messages')      AS en_mensajes,
    count(*) FILTER (WHERE tablename = 'inbox_conversations') AS en_conversaciones
  FROM pg_policies
  WHERE schemaname = 'public'
    AND cmd        = 'SELECT'
    AND tablename IN ('inbox_messages', 'inbox_conversations')
),
ultimo AS (
  SELECT max(m.created_at) AS momento
  FROM public.inbox_messages m
  JOIN public.inbox_conversations c ON c.id = m.conversation_id
  WHERE c.channel = 'whatsapp'
),
webhooks AS (
  -- 'ignored' es normal: son reentregas de Meta ya deduplicadas.
  -- 'received' solo preocupa si quedó viejo sin resolverse; recién
  -- llegado es simplemente un evento en curso.
  SELECT
    count(*)                                             AS total,
    count(*) FILTER (WHERE processing_status = 'failed') AS fallados,
    count(*) FILTER (
      WHERE processing_status = 'received'
        AND created_at < now() - interval '5 minutes'
    )                                                    AS colgados
  FROM public.inbox_webhook_events
  WHERE channel     = 'whatsapp'
    AND created_at  > now() - interval '24 hours'
)
SELECT * FROM (
  SELECT
    1 AS orden,
    'Tablas en la publicación supabase_realtime' AS chequeo,
    format('mensajes: %s, conversaciones: %s', p.mensajes, p.conversaciones) AS resultado,
    CASE WHEN p.mensajes = 1 AND p.conversaciones = 1
      THEN 'BIEN'
      ELSE 'MAL — aplicar supabase/migrations/20260723181409_enable_inbox_realtime.sql'
    END AS veredicto
  FROM publicadas p

  UNION ALL
  SELECT
    2,
    'La publicación emite INSERT y UPDATE',
    format('insert: %s, update: %s', o.pubinsert, o.pubupdate),
    CASE WHEN o.pubinsert AND o.pubupdate
      THEN 'BIEN'
      ELSE 'MAL — sin INSERT los mensajes nuevos nunca se emiten'
    END
  FROM operaciones o

  UNION ALL
  SELECT
    3,
    'Replica identity de las dos tablas',
    format('%s tabla(s) en NOTHING', i.sin_identidad),
    CASE WHEN i.sin_identidad = 0
      THEN 'BIEN — default alcanza para INSERT'
      ELSE 'MAL — replica identity NOTHING corta la emisión'
    END
  FROM identidad i

  UNION ALL
  SELECT
    4,
    'GRANT de SELECT al rol authenticated',
    format('%s de 2 tablas', g.con_select),
    CASE WHEN g.con_select = 2
      THEN 'BIEN'
      ELSE 'MAL — Realtime evalúa la RLS como authenticated y necesita el GRANT'
    END
  FROM permisos g

  UNION ALL
  SELECT
    5,
    'Policies de SELECT existentes',
    format('mensajes: %s, conversaciones: %s', pl.en_mensajes, pl.en_conversaciones),
    CASE WHEN pl.en_mensajes > 0 AND pl.en_conversaciones > 0
      THEN 'BIEN'
      ELSE 'MAL — sin policy de SELECT la RLS descarta todos los eventos'
    END
  FROM policies pl

  UNION ALL
  SELECT
    6,
    'Último mensaje de WhatsApp guardado',
    COALESCE(to_char(u.momento, 'YYYY-MM-DD HH24:MI:SS'), 'ninguno'),
    CASE
      WHEN u.momento IS NULL THEN 'REVISAR — no hay mensajes de WhatsApp en la base'
      WHEN u.momento > now() - interval '10 minutes'
        THEN 'BIEN — el webhook está guardando'
      ELSE 'INFO — mandate un WhatsApp de prueba y volvé a correr esto'
    END
  FROM ultimo u

  UNION ALL
  SELECT
    7,
    'Eventos de webhook en las últimas 24 h',
    format('total: %s, fallados: %s, sin terminar: %s', w.total, w.fallados, w.colgados),
    CASE
      WHEN w.fallados > 0 OR w.colgados > 0
        THEN 'MAL — el problema es el webhook, no Realtime: mirá los logs de Vercel'
      WHEN w.total = 0
        THEN 'INFO — Meta no entregó nada en 24 h'
      ELSE 'BIEN'
    END
  FROM webhooks w
) AS diagnostico
ORDER BY orden;


-- ════════════════════════════════════════════════════════════
-- PARTE B — Simulación de lo que hace Realtime con la RLS
--
-- Corré este bloque entero, por separado.
--
-- Realtime (walrus) evalúa la policy como el rol authenticated
-- con los claims del JWT del suscriptor. Esto reproduce eso
-- usando el usuario MENOS privilegiado que exista: si ese ve las
-- filas, cualquiera las ve.
--
-- BIEN: devuelve filas y acceso = true → la RLS no bloquea, y el
--       problema está en el socket del navegador.
-- MAL:  cero filas, acceso = false, o error → la RLS descarta
--       los eventos.
-- ════════════════════════════════════════════════════════════

BEGIN;

  SELECT set_config(
    'request.jwt.claims',
    json_build_object('sub', u.id, 'role', 'authenticated')::text,
    true  -- local: se descarta con el ROLLBACK
  )
  FROM public.users u
  WHERE u.deleted_at IS NULL
    AND COALESCE(u.is_active, true)
  ORDER BY (u.role IN ('admin', 'super_admin')), u.created_at
  LIMIT 1;

  SET LOCAL ROLE authenticated;

  SELECT
    current_setting('request.jwt.claims', true)::json ->> 'sub' AS usuario_simulado,
    m.id                                                        AS mensaje_visible,
    m.direction,
    m.created_at,
    public.inbox_can_access_conversation(m.conversation_id)     AS acceso
  FROM public.inbox_messages m
  JOIN public.inbox_conversations c ON c.id = m.conversation_id
  WHERE c.channel = 'whatsapp'
  ORDER BY m.created_at DESC
  LIMIT 5;

ROLLBACK;


-- ════════════════════════════════════════════════════════════
-- PARTE C — Test en vivo, aislando Realtime del webhook
--
-- ATENCIÓN: esto SÍ escribe. Inserta un mensaje de prueba en una
-- conversación real de WhatsApp. Es visible en la bandeja hasta
-- que corras el borrado de más abajo.
--
-- Cómo usarlo:
--   1. Abrí /dashboard/messages en el navegador y dejalo abierto.
--   2. Corré el INSERT.
--   3. Si el mensaje aparece solo, sin F5, Realtime funciona y no
--      queda nada por arreglar. Si no aparece, el socket sigue
--      entrando mal: abrí la consola del navegador, pestaña
--      Network → WS, y mirá si el join del canal lleva el token.
--   4. Corré el DELETE para limpiar.
--
-- Aísla el problema porque no pasa por Meta ni por el webhook:
-- si esto llega, lo único que podría fallar es el webhook.
-- ════════════════════════════════════════════════════════════

-- INSERT de prueba
INSERT INTO public.inbox_messages (
  conversation_id,
  direction,
  content,
  content_type,
  sender_type,
  sender_name,
  sent_at
)
SELECT
  c.id,
  'inbound',
  'PRUEBA REALTIME — borrar',
  'text',
  'contact',
  'Prueba',
  now()
FROM public.inbox_conversations c
WHERE c.channel = 'whatsapp'
ORDER BY c.last_message_at DESC NULLS LAST
LIMIT 1
RETURNING id, conversation_id, created_at;

-- Limpieza (corré este bloque entero después del test).
-- El trigger sync_inbox_conversation_after_message_change solo
-- corre en INSERT y UPDATE, así que borrar el mensaje no alcanza:
-- la conversación se quedaría con el preview y el unread del
-- mensaje de prueba. Hay que recomponer el resumen a mano.

WITH borrados AS (
  DELETE FROM public.inbox_messages
  WHERE content = 'PRUEBA REALTIME — borrar'
  RETURNING conversation_id
),
afectadas AS (
  SELECT DISTINCT conversation_id FROM borrados
)
UPDATE public.inbox_conversations c
SET
  last_message_at      = ultimo.momento,
  last_message_preview = ultimo.preview,
  unread_count         = COALESCE(pendientes.total, 0),
  updated_at           = now()
FROM afectadas a
LEFT JOIN LATERAL (
  SELECT
    COALESCE(m.sent_at, m.created_at) AS momento,
    left(m.content, 200)              AS preview
  FROM public.inbox_messages m
  WHERE m.conversation_id = a.conversation_id
  ORDER BY COALESCE(m.sent_at, m.created_at) DESC
  LIMIT 1
) AS ultimo ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS total
  FROM public.inbox_messages m
  WHERE m.conversation_id = a.conversation_id
    AND m.direction = 'inbound'
    AND NOT COALESCE(m.is_read, false)
) AS pendientes ON true
WHERE c.id = a.conversation_id
RETURNING c.id, c.last_message_at, c.last_message_preview, c.unread_count;
