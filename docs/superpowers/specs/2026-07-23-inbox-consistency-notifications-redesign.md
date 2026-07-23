# Rediseño de consistencia y notificaciones de la bandeja

## Objetivo

La barra lateral, el chat seleccionado y la campana deben representar el mismo mensaje entrante sin necesidad de recargar la página. El flujo debe tolerar desconexiones temporales de Realtime sin mantener varias versiones parciales del estado.

## Problemas actuales

- La barra lateral se actualiza con eventos de `inbox_conversations`.
- El chat se actualiza directamente con eventos de `inbox_messages`.
- La bandeja también escucha `notifications` como una tercera señal de reconciliación.
- Los snapshots HTTP y los payloads parciales de Realtime se mezclan mediante varias referencias, temporizadores y actualizaciones optimistas.
- El webhook actualiza mensaje, conversación y notificación en operaciones separadas.
- Los destinatarios de la campana dependen de asignación o rol administrador, no del tipo de bandeja.

Estas rutas independientes permiten que la barra muestre un resumen mientras el chat conserva otro estado, y que un mensaje válido no genere una notificación para el usuario correspondiente.

## Arquitectura propuesta

### Fuente de verdad

`inbox_messages` será la fuente de verdad para un mensaje recibido. La interfaz no incorporará el payload parcial de Realtime directamente al estado visible.

Una función y trigger de Postgres actualizarán `inbox_conversations` después de insertar un mensaje:

- `last_message_at`
- `last_message_preview`
- `unread_count` solamente para mensajes entrantes
- `updated_at`

Mensaje y resumen quedarán confirmados dentro de la misma transacción. Los webhooks dejarán de actualizar esos campos manualmente.

### Actualización del cliente

La bandeja tendrá un único canal Realtime para `inbox_messages`:

- `INSERT`: invalida y recarga la lista; recarga el chat si el mensaje pertenece a la conversación seleccionada.
- `UPDATE`: recarga únicamente el chat seleccionado cuando corresponde, para reflejar estados o adjuntos.
- `SUBSCRIBED` después de una desconexión: recarga lista y chat.

Realtime actuará como señal de invalidación. Los datos renderizados siempre provendrán de las APIs HTTP existentes, que devuelven registros completos con sus relaciones.

Se eliminarán del componente de mensajes:

- mutaciones directas basadas en payloads parciales;
- listener de `inbox_conversations`;
- listener duplicado de `notifications`;
- mapas y versiones de reconciliación que dejen de ser necesarios;
- polling permanente mientras el canal esté conectado.

Cuando Realtime esté desconectado, un polling de respaldo cada cinco segundos recargará lista y chat. El polling se detendrá al recuperar la conexión.

### Consistencia entre barra y chat

La recarga causada por un mensaje ejecutará una reconciliación coordinada:

1. Obtener conversaciones.
2. Mantener la conversación seleccionada si continúa visible bajo los filtros.
3. Obtener sus mensajes.
4. Aplicar ambos snapshots solamente si siguen correspondiendo a la solicitud y selección actuales.

La barra conservará `last_message_preview` como resumen denormalizado, pero ese valor será mantenido por el trigger a partir del mismo mensaje que aparece en el chat.

## Notificaciones

`notifyInboxMessage` resolverá destinatarios mediante `inbox_type`:

- `whatsapp_shared`: todos los usuarios de la plataforma.
- `email_shared`: todos los usuarios de la plataforma.
- `email_personal`: únicamente `assigned_user_id`, que debe corresponder al propietario de la cuenta.

La conversación personal sin propietario válido se considerará un error registrable; no se enviará silenciosamente a administradores como sustitución.

Cada notificación conservará:

- `type = inbox_message`
- conversación relacionada
- ID del mensaje en metadata
- canal, contacto y vista previa

La campana mantendrá su propio canal filtrado por `user_id`. No será utilizada para actualizar la bandeja de mensajes.

## Lectura y descarte

Abrir una conversación visible:

- marca esa conversación como leída;
- descarta únicamente las notificaciones del usuario actual vinculadas con esa conversación;
- no descarta notificaciones creadas para otros usuarios de una bandeja compartida.

Las solicitudes repetidas de lectura serán idempotentes. La interfaz podrá mostrar cero inmediatamente, pero reconciliará con el servidor si la operación falla.

## Seguridad

- Las inserciones de mensajes y notificaciones seguirán usando el cliente de servicio únicamente en rutas de servidor.
- El frontend continuará usando la sesión autenticada y RLS.
- No se expondrán credenciales ni se ampliarán políticas de lectura.
- La selección de destinatarios usará IDs de `public.users`; no confiará en metadata modificable del usuario.

## Manejo de errores

- Un fallo al crear notificaciones no revertirá ni ocultará el mensaje recibido.
- El error se registrará con conversación y mensaje para poder diagnosticarlo.
- Un canal Realtime degradado activará polling de respaldo.
- Una recarga HTTP fallida conservará el último snapshot válido y mostrará un estado de conexión, sin vaciar el chat.
- Al volver la conectividad, se hará una reconciliación inmediata.

## Pruebas

### Base de datos

- Insertar mensaje entrante y verificar que conversación, vista previa, fecha y contador se actualizan en la misma transacción.
- Insertar mensaje saliente y verificar que no aumenta `unread_count`.
- Confirmar idempotencia ante un mensaje de proveedor repetido.

### Destinatarios

- WhatsApp compartido crea una notificación por usuario.
- Email compartido crea una notificación por usuario.
- Email personal notifica únicamente al propietario.
- Abrir una conversación compartida descarta solo la notificación del usuario actual.

### Interfaz

- Un mensaje entrante aparece en barra y chat sin F5.
- La barra y el último mensaje del chat muestran el mismo contenido.
- La conversación sube al primer lugar.
- Realtime desconectado activa polling; reconexión lo detiene y reconcilia.
- Cambiar rápidamente de conversación no muestra mensajes de la selección anterior.
- TypeScript y build de producción finalizan correctamente.

## Fuera de alcance

- Cambiar el diseño visual de la bandeja.
- Sustituir Postgres Changes por Broadcast.
- Introducir colas externas.
- Modificar el envío de WhatsApp o la sincronización IMAP más allá de retirar actualizaciones de resumen duplicadas.
