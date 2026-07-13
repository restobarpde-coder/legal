# Diseño: bandeja unificada en tiempo real y notificaciones de mensajes

## Objetivo

La bandeja de mensajes debe reflejar inmediatamente los mensajes enviados por el usuario y los mensajes entrantes de WhatsApp o email, sin recargar manualmente. Los nuevos mensajes entrantes deben generar notificaciones persistentes y en tiempo real:

- para el usuario asignado a la conversación;
- para todos los administradores si la conversación no tiene asignado.

Los mensajes enviados por el propio usuario no generan una notificación para ese mismo usuario, pero sí deben aparecer inmediatamente en el hilo y actualizar el resumen de la conversación.

## Contexto actual

- `MessagesInbox` carga conversaciones y mensajes mediante `fetch`, pero no mantiene suscripciones Realtime.
- La respuesta de envío vuelve a cargar manualmente el hilo y la lista, por lo que depende de que el POST y las lecturas posteriores sean consistentes.
- WhatsApp entrante se persiste desde `/api/webhooks/whatsapp`.
- Email entrante se persiste desde `lib/inbox/imap.ts`, ejecutado por `/api/email/sync`.
- `useNotifications` carga `notifications`, pero solo escucha Broadcast en canales de tareas; los mensajes entrantes no insertan notificaciones.
- Las políticas de bandeja ya restringen el acceso a conversaciones/mensajes asignados y administradores. La publicación Realtime debe incluir las tablas necesarias.

## Arquitectura elegida

Usar Supabase Realtime basado en cambios persistidos en la base de datos, complementado con notificaciones persistentes en `public.notifications`.

### Alternativas descartadas

1. Broadcast únicamente: es rápido, pero se pierden eventos cuando una pestaña está cerrada o desconectada y no reemplaza la persistencia.
2. Polling periódico: funciona como respaldo, pero introduce latencia y consultas innecesarias.

## Flujo de mensajes

### Mensajes enviados

1. El endpoint de reply persiste el mensaje y ejecuta el envío al proveedor.
2. El endpoint actualiza el estado del mensaje y el resumen de la conversación.
3. Supabase Realtime publica los `INSERT`/`UPDATE`.
4. La bandeja recibe el evento, agrega o actualiza el mensaje por `id` y actualiza la lista de conversaciones.
5. La respuesta HTTP sigue siendo usada como confirmación y fallback, pero no es la única fuente de actualización.

La deduplicación por `message.id` evita que el mensaje aparezca dos veces cuando coinciden el evento Realtime y la recarga posterior.

### Mensajes entrantes

1. WhatsApp continúa entrando por webhook y email por sincronización IMAP.
2. El backend persiste el mensaje y actualiza `inbox_conversations`.
3. Se determina el destinatario:
   - `assigned_user_id`, si existe;
   - todos los usuarios con rol `admin`, si no existe.
4. Se inserta una fila por destinatario en `public.notifications` con tipo `inbox_message`, la conversación y el mensaje relacionados, y metadata de canal/contacto.
5. Realtime entrega el mensaje a la bandeja y la notificación al dropdown/browser.

El email no puede ser verdaderamente instantáneo mientras dependa de IMAP. La sincronización periódica de `/api/email/sync` determina la latencia. WhatsApp sí mantiene entrega inmediata mediante webhook.

## Cambios de base de datos

- Añadir `inbox_conversations`, `inbox_messages` y `notifications` a `supabase_realtime` de forma idempotente.
- Mantener RLS:
  - administradores pueden leer toda la bandeja;
  - usuarios pueden leer conversaciones y mensajes asignados a ellos;
  - cada usuario solo puede leer y actualizar sus propias notificaciones.
- No exponer `encrypted_password` ni relajar las políticas de credenciales.

## Cambios de servidor

- Crear un helper interno para generar notificaciones de mensajes, usando el cliente de servicio únicamente en servidor.
- Invocarlo después de persistir cada mensaje entrante de WhatsApp y email.
- Evitar notificar al remitente cuando el mensaje es outbound.
- Incluir `related_entity_type = 'inbox_conversation'`, `related_entity_id = conversationId` y metadata con `message_id`, `channel` y datos no sensibles del contacto.
- Manejar fallas de notificación sin perder el mensaje principal; registrar el error para diagnóstico.

## Cambios de cliente

### `MessagesInbox`

- Obtener la sesión/usuario y crear un canal Realtime estable por usuario.
- Suscribirse a cambios de `inbox_messages` y `inbox_conversations`.
- Filtrar mensajes por la conversación seleccionada cuando sea posible y validar acceso con la lectura existente.
- Actualizar mensajes, previews, timestamps, orden y `unread_count` sin duplicados.
- Limpiar el canal al desmontar o cambiar de sesión.
- Mostrar estado de conexión o conservar el botón manual de actualización como fallback.

### `useNotifications`

- Mantener la carga inicial desde `notifications`.
- Añadir suscripción Realtime a `notifications` con filtro por `user_id`.
- Conservar Broadcast como compatibilidad para notificaciones existentes, deduplicando por `id`.
- Mostrar notificación de navegador para nuevos mensajes si el permiso está concedido.
- Mantener lectura y dismiss actuales.

## Errores y consistencia

- Si Realtime se desconecta, la interfaz conserva los datos actuales y puede recuperar el estado con una recarga automática al reconectar.
- Si falla la creación de una notificación, el mensaje permanece guardado y el error se registra; la notificación no debe provocar el rollback del mensaje.
- Las respuestas de los endpoints seguirán devolviendo el `message_id` para confirmación y pruebas.
- Los eventos Realtime se tratarán como potencialmente duplicados o fuera de orden.

## Verificación

1. Ejecutar typecheck/build.
2. Verificar la publicación Realtime y las políticas con consultas SQL.
3. Probar dos sesiones autenticadas:
   - administrador;
   - usuario asignado.
4. Validar envío de email/WhatsApp: el mensaje aparece sin recargar.
5. Validar entrada de WhatsApp: mensaje, preview y notificación aparecen en tiempo real.
6. Validar entrada de email después de una sincronización IMAP: mensaje y notificación aparecen tras la sincronización.
7. Validar conversación sin asignado: todos los administradores reciben notificación.
8. Validar que un usuario no vea notificaciones de otro y que no se dupliquen mensajes ni notificaciones tras reconexión.

