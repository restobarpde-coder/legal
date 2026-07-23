# Publicación Realtime para la bandeja de mensajes

## Problema

Los mensajes entrantes de WhatsApp se guardan correctamente y aparecen después de recargar `/dashboard/messages`, pero no llegan a la interfaz mientras la página permanece abierta. El cliente ya crea canales `postgres_changes` para `inbox_messages` e `inbox_conversations`, autentica el socket y reconcilia datos cuando la conexión se recupera. Sin embargo, el repositorio no registra que esas tablas hayan sido agregadas a la publicación `supabase_realtime`.

## Solución

Crear una migración idempotente que agregue las tablas `public.inbox_messages` y `public.inbox_conversations` a `supabase_realtime` solamente cuando todavía no sean miembros de esa publicación.

La suscripción existente seguirá siendo el mecanismo principal:

1. El webhook persiste el mensaje entrante y actualiza su conversación.
2. Postgres publica ambos cambios.
3. El canal autenticado de la bandeja recibe los eventos.
4. La conversación se reordena y el chat seleccionado incorpora el mensaje.
5. La reconciliación HTTP existente completa relaciones o campos no incluidos en el evento y recupera eventos perdidos tras una reconexión.

No se agregará un segundo sistema de eventos ni se cambiará el modelo de mensajes.

## Manejo de errores

La migración debe poder ejecutarse varias veces sin fallar. Si una tabla ya está publicada, no intentará agregarla nuevamente. El polling de reconciliación y los manejadores de reconexión existentes continuarán funcionando como respaldo ante interrupciones temporales de WebSocket.

## Verificación

- Ejecutar el chequeo de TypeScript y la compilación de producción.
- Verificar en la base remota que ambas tablas pertenecen a `supabase_realtime`.
- Con la bandeja abierta, insertar o recibir un mensaje entrante de WhatsApp y confirmar que aparece sin F5.
- Confirmar que la conversación sube al primer lugar y que el contador de no leídos se comporta correctamente.
- Confirmar que email continúa usando el mismo flujo sin regresiones.

## Fuera de alcance

- Reemplazar Postgres Changes por Broadcast.
- Cambiar webhooks de WhatsApp o sincronización IMAP.
- Modificar el diseño visual de la bandeja.
- Reducir el intervalo de polling para simular tiempo real.
