# 🔔 Sistema de Notificaciones - Guía Rápida

## Arquitectura (desde julio 2026)

Las notificaciones se crean **en la base de datos** y llegan al navegador por
**Supabase Realtime** (`postgres_changes` sobre la tabla `notifications`), con
reconciliación por polling cada 30 s como respaldo. No hay SSE propio.

| Evento | Quién lo crea | Dónde |
|--------|---------------|-------|
| Tarea asignada / reasignada | Trigger `trg_notify_task_change` | `sql/20-notifications-reliability.sql` |
| Cambio de fecha de vencimiento | Trigger `trg_notify_task_change` | idem |
| Tarea completada (avisa a creador y asignado) | Trigger `trg_notify_task_change` | idem |
| Recordatorio de vencimiento | `process_task_reminders()` vía **pg_cron cada 5 min** | idem |
| Tarea vencida | `process_task_reminders()` (una sola vez por vencimiento) | idem |
| Mensaje de WhatsApp entrante | Webhook → `notifyInboxMessage` | `app/api/webhooks/whatsapp/route.ts` |
| Email entrante | Webhook Hostinger → sync IMAP → `notifyInboxMessage` | `lib/inbox/imap.ts` |

Al vivir en la BD, los triggers cubren **todos** los caminos de escritura
(rutas API y también inserts directos del cliente como `/dashboard/tasks/new`),
y los recordatorios no dependen de Vercel.

### Recordatorios por prioridad

| Prioridad | Umbrales (horas antes de vencer) |
|-----------|----------------------------------|
| **Urgente / Crítica** | 0.5, 1, 2, 4, 8, 12, 24, 48 |
| **Alta** | 1, 4, 12, 24, 48, 72 |
| **Media** | 4, 24, 48, 72 |
| **Baja** | 24, 72, 168 |

Cada umbral se envía **una sola vez** por (tarea, fecha de vencimiento). Si el
cron se atrasa, el recordatorio sale tarde pero sale, y nunca se duplica. Si se
cambia la fecha de vencimiento, la escalera se rearma.

## Despliegue

### 1. Ejecutar la migración SQL (una vez)

Pegar `sql/20-notifications-reliability.sql` en el **SQL Editor** de Supabase y
ejecutar. Instala el trigger, la función de recordatorios, los jobs de pg_cron
(recordatorios cada 5 min, limpieza diaria 03:30) y un índice de dedupe.

> Si `CREATE EXTENSION pg_cron` falla, habilitar **pg_cron** desde
> Dashboard → Database → Extensions y volver a ejecutar la sección 3 del script.

### 2. Configurar `CRON_SECRET` en Vercel

El cron diario de Vercel (`vercel.json` → `/api/notifications/check`) queda
como **respaldo**. Vercel agrega automáticamente el header
`Authorization: Bearer $CRON_SECRET` si la variable existe. Sin `CRON_SECRET`
configurado, el endpoint devuelve 401 (ya no hay secreto por defecto).

### 3. Desplegar el código

Deploy normal. Hacerlo **enseguida después** de la migración: mientras conviva
el código viejo con el trigger nuevo, las asignaciones pueden notificarse dos
veces.

## Verificación

```sql
-- Jobs programados
SELECT jobid, jobname, schedule FROM cron.job;

-- Últimas corridas del cron
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Corrida manual de recordatorios
SELECT public.process_task_reminders();

-- Últimas notificaciones creadas
SELECT type, title, message, created_at FROM notifications ORDER BY created_at DESC LIMIT 10;
```

Prueba end-to-end: crear una tarea asignada a otro usuario → la notificación
debe aparecer en su campana al instante (Realtime). Crear una tarea propia con
vencimiento en 2 horas y prioridad urgente → el recordatorio llega en la
próxima corrida de pg_cron (≤ 5 min).

También se puede disparar el respaldo manualmente:

```bash
curl -X POST https://<tu-app>/api/notifications/check \
  -H "Authorization: Bearer $CRON_SECRET"
```

## UI

- 🔴 **Badge rojo**: notificaciones pendientes.
- 🟢 **Punto verde**: canal Realtime conectado (si falta, hay polling cada 30 s).
- El permiso de notificaciones nativas del navegador se pide al abrir la
  campana por primera vez; las nativas solo se muestran con la pestaña oculta.
- Colores de urgencia: 🔴 crítico (< 1 h) · 🟠 alto · 🟡 medio · 🔵 bajo.

## Solución de problemas

1. **No llegan recordatorios**: revisar `cron.job_run_details`; correr
   `SELECT public.process_task_reminders();` a mano y mirar el JSON devuelto.
2. **No llegan en tiempo real**: verificar que `notifications` esté en la
   publicación `supabase_realtime` (`sql/12-enable-realtime-notifications.sql`)
   y que el socket use el JWT de sesión (`supabase.realtime.setAuth()` ya se
   llama en `hooks/use-notifications.ts`).
3. **Diagnóstico de tareas candidatas**:
   `GET /api/notifications/debug?secret=$CRON_SECRET`.

## Archivos principales

```
sql/20-notifications-reliability.sql   # Trigger + recordatorios + pg_cron
app/api/notifications/check/route.ts   # Respaldo vía Vercel Cron (GET/POST)
lib/notification-scheduler.ts          # Wrapper RPC → process_task_reminders()
lib/inbox/notifications.ts             # Notificaciones de inbox (WhatsApp/email)
hooks/use-notifications.ts             # Realtime + polling + estado en el cliente
components/notification-dropdown.tsx   # Campana del header
```
