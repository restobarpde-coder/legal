# Bandeja de email confiable y casi en tiempo real

## Objetivo

La bandeja debe mostrar cada email entrante una sola vez, normalmente pocos segundos después de que Hostinger lo recibe. Los mensajes enviados no deben desaparecer y el estado leído/no leído debe permanecer consistente ante eventos Realtime, recargas y varias pestañas abiertas.

La solución debe conservar Vercel Free y Supabase Free. No se requiere cambiar el proveedor de correo ni contratar infraestructura durante esta etapa.

## Diagnóstico

La recepción actual depende de un GitHub Action que consulta IMAP cada cinco minutos. Supabase Realtime solo puede notificar después de que esa consulta persiste el mensaje, por lo que no convierte el correo en tiempo real.

Además existen cuatro problemas de consistencia:

1. La interfaz recarga la lista completa ante inserciones y actualizaciones relacionadas. Respuestas fuera de orden pueden reemplazar estado más nuevo con datos anteriores.
2. La referencia que recuerda una conversación como ya abierta impide confirmar nuevamente la lectura cuando llega otro mensaje a esa conversación.
3. El envío optimista agrega una fila local y luego vuelve a cargar toda la conversación, en lugar de reconciliarla con el identificador persistido. Según el orden de Realtime y HTTP, la fila puede duplicarse o desaparecer temporalmente.
4. La importación IMAP comprueba duplicados antes de insertar y después incrementa `unread_count` mediante lectura y escritura separadas. Dos ejecuciones concurrentes pueden superar la comprobación o perder actualizaciones. La restricción única ayuda cuando existe `Message-ID`, pero la operación completa no es atómica y los mensajes sin `Message-ID` no tienen una clave estable.

## Arquitectura elegida

### Webhook nativo de Hostinger

Hostinger Agentic Mail enviará el evento `message.received` a un endpoint HTTPS de la aplicación en Vercel. El endpoint:

- validará el token Bearer específico del webhook usando comparación de tiempo constante;
- identificará la cuenta por la dirección de la casilla incluida en el evento;
- acusará recibo únicamente después de validar y programar el procesamiento;
- disparará inmediatamente la sincronización IMAP incremental de esa cuenta para recuperar contenido y adjuntos completos;
- devolverá respuestas idempotentes cuando Hostinger reintente el mismo evento;
- no registrará el token, credenciales ni contenido sensible en logs.

Usar el webhook como señal y el sincronizador IMAP como lector evita depender de que el payload incluya el cuerpo completo. El mismo código de parseo e ingestión será compartido por el webhook y el cron existente.

### Recuperación gratuita

El cron actual de cinco minutos permanecerá como mecanismo de reconciliación. Si Vercel no procesa un webhook o Hostinger agota sus reintentos, el cron importará cualquier UID pendiente. El endpoint de sincronización y el webhook usarán un bloqueo por cuenta para evitar procesamiento concurrente.

Esta arquitectura conserva Vercel Free y Supabase Free y no requiere Render ni otro proceso persistente.

Referencia verificada el 13 de julio de 2026:

- https://www.hostinger.com/support/how-to-use-agentic-mail-in-hpanel/

## Ingestión idempotente y atómica

Se creará una función de base de datos para registrar un email entrante como una sola unidad lógica. Recibirá metadatos ya parseados, resolverá el hilo y devolverá el mensaje/conversación resultantes.

La clave de deduplicación será:

- preferentemente `email_account_id + Message-ID` normalizado;
- como respaldo, `email_account_id + UIDVALIDITY + UID` para mensajes sin `Message-ID`.

La cuenta almacenará `uid_validity` junto con `last_uid`. Si UIDVALIDITY cambia, el proceso no reutilizará el watermark anterior y deduplicará por las claves persistidas.

Dentro de la misma transacción se hará lo siguiente:

1. adquirir un bloqueo asesor por cuenta;
2. comprobar/insertar el mensaje con `ON CONFLICT`;
3. crear o resolver la conversación usando `In-Reply-To`, `References` y asunto normalizado como último respaldo;
4. actualizar el resumen y contador mediante incremento atómico solamente si el mensaje fue insertado;
5. crear la notificación solamente si el mensaje fue insertado;
6. avanzar el watermark después de persistir correctamente.

Los adjuntos se archivarán después de crear el mensaje. Un fallo aislado de adjunto quedará registrado y no duplicará el email durante el siguiente intento.

## Estado leído/no leído

Leer será una operación explícita e idempotente separada del cambio de estado de la conversación. Un endpoint `mark-read` actualizará en una operación:

- todos los mensajes entrantes no leídos de la conversación;
- `read_at`;
- `unread_count = 0`;
- las notificaciones asociadas pendientes.

Abrir una conversación invocará esta operación incluso si ya estuvo abierta anteriormente. Cuando Realtime entregue un mensaje entrante para la conversación visible y la pestaña esté activa, la UI lo agregará y volverá a marcar la conversación como leída. Si la pestaña no está activa, conservará el contador y la notificación.

El campo `status` (`open`, `pending`, etc.) no se modificará al leer. Actualmente abrir fuerza `status: open`; ese acoplamiento se eliminará.

## Sincronización de la interfaz

La lista inicial y el historial se cargarán por HTTP. Después, Realtime aplicará cambios incrementales por identificador:

- `INSERT inbox_messages`: upsert del mensaje en la conversación visible y actualización puntual del resumen;
- `UPDATE inbox_messages`: mezcla de campos sin agregar otra fila;
- `UPDATE inbox_conversations`: upsert de esa conversación, sin recargar toda la lista;
- reconexión de Realtime: recarga de reconciliación una sola vez.

Se descartarán respuestas HTTP pertenecientes a una selección o solicitud anterior mediante un `AbortController` o número de generación.

La bandeja mantendrá una única estrategia de reconciliación para evitar que HTTP y Realtime compitan entre sí:

- al seleccionar otra conversación, cancelará la carga de detalle anterior y limpiará inmediatamente los mensajes visibles para no mostrar contenido de la selección previa;
- cada carga de lista y detalle tendrá una generación monotónica, de modo que una respuesta antigua nunca pueda reemplazar una respuesta o evento más nuevo, incluso en una secuencia rápida A → B → A;
- los cambios de conversación se combinarán por `id`, incorporarán filas nuevas, eliminarán las que ya no coincidan con los filtros activos y ordenarán por `last_message_at` descendente;
- los eventos consecutivos programarán una sola recarga HTTP breve y agrupada para completar relaciones que no vienen en el payload de Realtime, sin perder la actualización visual inmediata;
- una reconexión de Realtime ejecutará una sola recarga de recuperación, no una recarga por cada cambio de estado del canal;
- cuando una pestaña vuelva a estar visible o recupere conexión, hará una reconciliación para cubrir eventos perdidos durante la suspensión;
- solamente la conversación seleccionada en una pestaña visible se marcará automáticamente como leída.

### Base de datos como única fuente de verdad

La interfaz no creará burbujas optimistas ni mensajes con identificadores locales. Tanto los mensajes enviados desde la plataforma como los recibidos por webhook se mostrarán solamente después de existir en `inbox_messages`.

El envío seguirá este flujo:

1. el cliente deshabilita el compositor y muestra el estado `Enviando…`;
2. la API valida la solicitud y persiste inmediatamente el mensaje saliente con estado de entrega `pending`;
3. el `INSERT` de Supabase Realtime incorpora esa fila real al chat usando su identificador de base de datos;
4. la respuesta HTTP devuelve el mismo registro persistido y lo incorpora mediante upsert como respaldo si Realtime se retrasó o perdió el evento;
5. el servidor envía por SMTP o WhatsApp y actualiza el estado a `sent` o `failed`;
6. el `UPDATE` de Realtime combina el nuevo estado sobre la misma fila.

Realtime será el transporte inmediato, no la fuente de verdad exclusiva. Las cargas HTTP iniciales, las respuestas de la API y las reconciliaciones por reconexión o visibilidad leerán la misma base y cubrirán eventos perdidos. Una instantánea HTTP en segundo plano se fusionará por `id` con el estado visible; nunca reemplazará mensajes persistidos más recientes con una respuesta anterior.

Si la solicitud falla antes de persistir, no aparecerá ninguna burbuja. Si el proveedor falla después de persistir, la fila permanecerá visible como fallida en lugar de desaparecer. De este modo no habrá una copia local y otra persistida compitiendo por representar el mismo mensaje.

## Notificaciones

La notificación se originará durante la ingestión, no desde la interfaz. Supabase Realtime actualizará el indicador global inmediatamente después de persistirla. Abrir la conversación la descartará mediante la misma operación `mark-read`.

No se emitirán notificaciones para filas deduplicadas ni para emails salientes reflejados accidentalmente en una carpeta observada.

## Seguridad y límites

- Las credenciales IMAP seguirán cifradas en Supabase y solo serán descifradas dentro del sincronizador del servidor.
- Vercel recibirá el token del webhook, la clave de servicio y la clave de cifrado como secretos, nunca dentro del repositorio ni de respuestas HTTP.
- La función de ingestión no será ejecutable por `anon` ni `authenticated`; únicamente por el rol de servicio.
- Se conservarán RLS y las reglas actuales de visibilidad por cuenta.
- El sincronizador consultará solamente `INBOX`; el correo enviado por SMTP continuará registrándose directamente desde la API.

## Verificación

Se cubrirán estos escenarios:

1. Un email nuevo aparece una sola vez en segundos y crea una sola notificación.
2. Dos sincronizadores intentan importar el mismo UID y solo una fila/contador/notificación se crea.
3. Un email sin `Message-ID` se deduplica por UIDVALIDITY y UID.
4. Un mensaje llega mientras su conversación está visible y permanece leído.
5. Un mensaje llega con la pestaña en segundo plano y permanece no leído hasta abrirlo.
6. Un mensaje enviado aparece una sola vez cuando se persiste, conserva el mismo identificador durante `pending`, `sent` o `failed` y no desaparece durante reconciliaciones HTTP.
7. Un fallo SMTP queda visible como fallido y puede reintentarse sin doble envío.
8. Hostinger reintenta un webhook y no se duplica el mensaje.
9. Un webhook omitido o fallido es recuperado por el cron de cinco minutos.
10. Varias pestañas convergen al mismo estado después de los eventos Realtime.
11. Cambiar rápidamente A → B → A nunca muestra mensajes de otra conversación ni permite que una respuesta anterior reemplace la actual.
12. Una conversación nueva aparece sin recargar, y una conversación existente con actividad nueva sube al primer lugar.
13. Cambiar el estado de una conversación la incorpora o retira de la lista según el filtro activo.
14. Recuperar Realtime, la conexión de red o la visibilidad de la pestaña produce una sola reconciliación y no duplica mensajes.

## Entrega por etapas

1. Corregir carreras de UI, adoptar la base de datos como única fuente de mensajes, implementar lectura explícita e ingestión atómica.
2. Extraer la ingestión compartida y agregar el webhook autenticado de Hostinger.
3. Configurar el webhook en hPanel y sus secretos en Vercel.
4. Desplegar, ejecutar pruebas con una cuenta Hostinger y observar duplicados, latencia y reintentos.

La primera etapa mejora inmediatamente la confiabilidad aunque el webhook todavía no esté configurado. Las etapas dos a cuatro reducen la latencia habitual de cinco minutos a segundos.
