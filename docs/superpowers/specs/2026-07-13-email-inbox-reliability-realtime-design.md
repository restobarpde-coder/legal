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

### Listener IMAP

Se agregará un proceso Node.js independiente que mantenga una conexión IMAP IDLE por cada cuenta activa. El listener:

- abre `INBOX`, procesa mensajes posteriores al UID confirmado y entra en IDLE;
- ante una notificación de Hostinger, recupera y persiste los UIDs nuevos;
- renueva IDLE y reconecta con backoff y jitter ante cierres o errores;
- al reconectar ejecuta una recuperación desde el último UID persistido;
- expone únicamente `/health`, con estado de conexión y última sincronización, sin credenciales ni contenido de emails;
- responde a `SIGTERM` cerrando conexiones limpiamente.

El código de parseo e ingestión será compartido por el listener y por el cron existente. No habrá dos implementaciones de sincronización.

### Alojamiento gratuito

El listener se preparará como Web Service gratuito de Render. Un workflow de GitHub consultará `/health` cada diez minutos para reducir suspensiones por inactividad. Render ofrece 750 horas gratuitas mensuales para Web Services, pero puede reiniciar servicios gratuitos y no los recomienda para producción; por eso esta modalidad ofrece tiempo casi real, no una garantía formal de disponibilidad.

El cron actual de cinco minutos permanecerá como mecanismo de recuperación. Si Render duerme o reinicia el proceso, el cron importará cualquier UID pendiente. El endpoint de sincronización y el listener usarán un bloqueo por cuenta para evitar procesamiento concurrente.

Referencias verificadas el 13 de julio de 2026:

- https://render.com/docs/free
- https://render.com/docs/service-types
- https://www.koyeb.com/docs/reference/instances
- https://docs.railway.com/pricing/free-trial

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

Para enviar, el cliente generará una clave idempotente. El servidor la guardará con el mensaje y devolverá el registro completo. La UI reemplazará la fila local por esa fila; un evento Realtime con el mismo identificador o clave se combinará. Ante error SMTP, el mensaje persistido se mostrará como fallido en lugar de desaparecer silenciosamente.

## Notificaciones

La notificación se originará durante la ingestión, no desde la interfaz. Supabase Realtime actualizará el indicador global inmediatamente después de persistirla. Abrir la conversación la descartará mediante la misma operación `mark-read`.

No se emitirán notificaciones para filas deduplicadas ni para emails salientes reflejados accidentalmente en una carpeta observada.

## Seguridad y límites

- Las credenciales IMAP seguirán cifradas en Supabase y solo serán descifradas dentro del listener/servidor.
- Render recibirá la clave de servicio y la clave de cifrado como secretos, nunca dentro del repositorio o del endpoint de salud.
- La función de ingestión no será ejecutable por `anon` ni `authenticated`; únicamente por el rol de servicio.
- Se conservarán RLS y las reglas actuales de visibilidad por cuenta.
- El listener observará solamente `INBOX`; el correo enviado por SMTP continuará registrándose directamente desde la API.

## Verificación

Se cubrirán estos escenarios:

1. Un email nuevo aparece una sola vez en segundos y crea una sola notificación.
2. Dos sincronizadores intentan importar el mismo UID y solo una fila/contador/notificación se crea.
3. Un email sin `Message-ID` se deduplica por UIDVALIDITY y UID.
4. Un mensaje llega mientras su conversación está visible y permanece leído.
5. Un mensaje llega con la pestaña en segundo plano y permanece no leído hasta abrirlo.
6. Una respuesta optimista se reconcilia con HTTP y Realtime sin desaparecer ni duplicarse.
7. Un fallo SMTP queda visible como fallido y puede reintentarse sin doble envío.
8. El listener se reinicia y recupera exactamente los UIDs faltantes.
9. Una caída prolongada de Render es recuperada por el cron de cinco minutos.
10. Varias pestañas convergen al mismo estado después de los eventos Realtime.

## Entrega por etapas

1. Corregir carreras de UI, lectura explícita, claves idempotentes e ingestión atómica.
2. Extraer el sincronizador compartido y agregar el listener IMAP IDLE con pruebas de reconexión.
3. Agregar configuración de Render y health check de GitHub Actions.
4. Desplegar, ejecutar pruebas con una cuenta Hostinger y observar duplicados, latencia y reconexiones.

La primera etapa mejora inmediatamente la confiabilidad aunque el listener todavía no esté desplegado. Las etapas dos a cuatro reducen la latencia habitual de cinco minutos a segundos.
