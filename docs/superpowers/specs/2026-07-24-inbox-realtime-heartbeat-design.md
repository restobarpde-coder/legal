# Heartbeat confiable para mensajes y notificaciones

## Problema confirmado

Los mensajes entrantes y salientes se guardan correctamente en `inbox_messages`, alcanzan al proveedor y son devueltos por la API. Sin embargo, el navegador puede mantener el canal Supabase con estado `SUBSCRIBED` sin recibir eventos `postgres_changes`. El frontend interpreta ese estado como garantía de funcionamiento, desactiva el polling y queda desactualizado hasta otra reconciliación.

## Diseño

Realtime continuará siendo la vía rápida. Cuando entrega un evento, la bandeja recarga inmediatamente los datos autoritativos.

Además, se incorporará un heartbeat HTTP cada tres segundos mientras la pestaña esté visible:

1. Consultar una marca de versión liviana para conversaciones, mensajes y notificaciones.
2. Compararla con la última versión observada por el cliente.
3. Recargar solamente los recursos cuya versión cambió.
4. Conservar el último snapshot válido si la comprobación falla.

El heartbeat funcionará independientemente de que el socket diga `SUBSCRIBED`. Esto cubre conexiones silenciosamente degradadas sin descargar listas y chats completos en cada intervalo.

## Envío saliente

Después de una respuesta exitosa:

- recargar inmediatamente los mensajes de la conversación desde la API;
- recargar inmediatamente la lista de conversaciones;
- usar la respuesta del servidor únicamente como confirmación, no como estado definitivo.

Así, la interfaz no dependerá del payload de Realtime ni de una burbuja optimista para reflejar el mensaje enviado.

## Notificaciones

El proveedor de notificaciones usará el mismo principio:

- Realtime agrega o actualiza inmediatamente cuando funciona;
- un heartbeat visible cada tres segundos consulta si cambió la versión;
- si cambió, vuelve a cargar las notificaciones pendientes del usuario.

No se modificarán las reglas de destinatarios: las bandejas compartidas notifican a todos y las personales solo a su propietario.

## Endpoint de versión

Se agregará un endpoint autenticado que devuelva únicamente marcas temporales o identificadores máximos accesibles para el usuario:

- última actualización de conversación;
- último mensaje;
- última notificación pendiente.

No devolverá contenido de mensajes ni datos de otros usuarios. Las consultas respetarán la sesión y RLS.

## Recuperación y errores

- Al volver a una pestaña visible o recuperar conexión de red se hará una reconciliación inmediata.
- Un error del heartbeat no vaciará la interfaz.
- El siguiente intervalo volverá a intentarlo.
- Las solicitudes anteriores se ignorarán si una selección o versión más reciente ya fue aplicada.

## Verificación

- Un saliente aparece inmediatamente después de ser confirmado por el servidor.
- Un entrante aparece por Realtime cuando el canal funciona.
- Al simular pérdida silenciosa de eventos, aparece en un máximo de tres segundos.
- Barra lateral y chat muestran el mismo último mensaje.
- La campana se actualiza en un máximo de tres segundos si pierde su evento.
- Una pestaña oculta no ejecuta consultas periódicas.
- TypeScript y build de producción finalizan correctamente.

## Fuera de alcance

- Migrar a Realtime Broadcast.
- Cambiar el modelo de mensajes o sus reglas de destinatarios.
- Incorporar service workers o notificaciones push con la aplicación cerrada.
