# Bandeja: marcar al abrir como leído

## Objetivo

Una conversación que el usuario abre en la bandeja no debe conservar ni volver a mostrar un contador de mensajes no leídos, salvo que llegue después un nuevo mensaje entrante.

## Diagnóstico

La interfaz intenta marcar la conversación como leída al seleccionarla y al recibir eventos de Realtime. Sin embargo, los eventos de `inbox_conversations` y las recargas de la lista pueden reintroducir un valor anterior de `unread_count`. El ingreso de email también incrementa el contador fuera de una operación atómica con el guardado del mensaje, por lo que el orden de eventos puede variar.

## Enfoque aprobado

Mantener `inbox_conversations.unread_count` como contador persistido y reforzar el estado de lectura del cliente.

- Al abrir una conversación visible, enviar la operación de marcado como leída y actualizar la interfaz de forma optimista a `0`.
- Mientras la conversación continúe seleccionada y la pestaña esté visible, cualquier actualización de Realtime o recarga que traiga un contador positivo se tratará como potencialmente atrasada y se volverá a confirmar como leída antes de mostrarla.
- Al enviar una respuesta, aplicar la misma confirmación de lectura como protección adicional.
- La operación de servidor seguirá marcando todos los mensajes entrantes no leídos y reiniciando `unread_count` a cero; debe devolver un fallo explícito si no puede completar la actualización.
- Un mensaje entrante nuevo para una conversación abierta se incorporará primero y se volverá a marcar como leído; para una conversación no abierta, conservará/incrementará su contador.

## Validación

- Abrir una conversación con `unread_count = 1`: el badge desaparece sin recargar la página.
- Recargar o recibir el evento Realtime posterior: el badge sigue en cero mientras la conversación está abierta.
- Cambiar a otra conversación y recibir un mensaje en la primera: el badge vuelve a aparecer.
- Enviar una respuesta: el contador queda en cero.

## Alcance

No cambia la asignación de conversaciones ni el reparto de notificaciones; solo la semántica de lectura y la resistencia frente a actualizaciones asincrónicas.
