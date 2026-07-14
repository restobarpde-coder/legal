# Bandeja de mensajes: widget de contexto, clasificación, notas, autodetección de cliente y nueva conversación en modal

## Objetivo

Mejorar el módulo de Mensajes (`components/messages-inbox.tsx`) para que el panel derecho funcione como un widget único de contexto de la conversación, aprovechando funcionalidad de backend que ya existe pero no tiene UI (`inbox_notes`, `classification`, `assigned_user_id`), corrigiendo el matching de cliente por teléfono, agregando un buscador funcional a la lista de conversaciones, y rediseñando "Nueva conversación" como un modal con autocompletado de cliente/contacto.

**Nota de superación de spec previo**: el spec [2026-07-13-bandeja-profesional-acceso-y-nueva-conversacion-design.md](./2026-07-13-bandeja-profesional-acceso-y-nueva-conversacion-design.md) había decidido explícitamente que "Nueva conversación" NO debía usar un `Dialog`/modal, sino redacción integrada en el panel central. Esta decisión se revierte de forma deliberada en este spec: se confirmó con el usuario que el modal es la dirección correcta ahora. Ese spec previo también mencionaba `prioridad` y `etiquetas` en el panel de contexto; este spec las deja fuera de alcance a favor de un único campo `classification` (ver "Fuera de alcance").

## Panel derecho: widget de contexto

Se mantiene como un único panel con secciones apiladas y scroll (no tabs), en este orden:

1. **Contacto** — sin cambios de fondo (nombre, teléfono/email, badge de canal).

2. **Vinculación de cliente**:
   - Si la conversación ya tiene `linked_client_id`: se muestra el nombre del cliente y el caso vinculado (si existe), con botón "Desvincular". Reutiliza `link-client-dialog.tsx` para vincular/desvincular manualmente.
   - Si NO tiene `linked_client_id` pero hay un cliente sugerido (ver "Autodetección de cliente por teléfono" abajo): tarjeta "Posible cliente: **{nombre}**" con botón "Vincular" (llama al PATCH existente con `linked_client_id`) y un enlace secundario "Buscar cliente manualmente" que abre el dialog existente.
   - Si no hay vínculo ni sugerencia: se mantiene el texto actual ("Consulta de potencial cliente. Podrás vincularla desde el panel administrativo.").

3. **Asignación** — deja de ser de solo lectura. Un `<select>` lista los usuarios (`GET /api/inbox/users`) más la opción "Sin asignar"; al cambiar, llama a `PATCH /api/inbox/conversations/[id]/assign` (endpoint existente, sin cambios).

4. **Clasificación** — un `<select>` con las 5 opciones ya soportadas por la columna `classification` (`consultation`, `appointment`, `client_matter`, `notarial`, `other`), mostradas en español ("Consulta", "Cita", "Asunto de cliente", "Notarial", "Otro"). Cambia mediante el PATCH existente de `/api/inbox/conversations/[id]` (ya acepta `classification` en su whitelist, sin cambios de backend).

5. **Notas** — lista cronológica (autor, fecha, contenido) desde `GET /api/inbox/conversations/[id]/notes` (existente), con un textarea y botón "Agregar nota" (`POST`, existente). Cada nota muestra "Editar"/"Borrar" solo si `author_user_id === usuario actual` (o admin).

## Autodetección de cliente por teléfono

**Problema actual**: tanto `resolveWhatsAppConversation()` (webhook) como `resolveInboxContact()` (`lib/inbox/contacts.ts`) matchean por igualdad exacta de string contra `clients.phone`, sin usar el normalizador `normalizePhoneUY()` que ya existe en `lib/phone.ts`. Además, el webhook auto-vincula `linked_client_id` en el insert de la conversación sin confirmación humana.

**Cambios**:

- Nueva función de sugerencia (en `lib/inbox/contacts.ts` o archivo nuevo `lib/inbox/client-match.ts`): dado un teléfono de contacto, normaliza con `normalizePhoneUY()`, obtiene los últimos 8 dígitos, busca candidatos en `clients` con `phone ilike '%{últimos 8 dígitos}%'` (acota el universo sin depender de formato), y para cada candidato aplica `normalizePhoneUY()` sobre `clients.phone` comparando el `e164` resultante contra el del contacto. Si hay exactamente un match confirmado, se devuelve como candidato; si hay cero o más de uno, no se sugiere nada (ambigüedad = no autodetectar).
- `GET /api/inbox/conversations/[id]` incluye `suggested_client: { id, name } | null` en la respuesta cuando `linked_client_id` es `null` y existe un contacto con teléfono.
- El webhook de WhatsApp (`resolveWhatsAppConversation`) **deja de** setear `linked_client_id` automáticamente en el insert. La detección de cliente pasa a ser siempre sugerencia + confirmación manual desde el widget, sin excepción — incluso para conversaciones nuevas.
- `resolveInboxContact()` sigue registrando el contacto en `inbox_contacts`, pero ya no fuerza el link a nivel de `inbox_conversations`.

## Buscador de conversaciones

- El input "Buscar próximamente" (deshabilitado) se reemplaza por un buscador funcional con debounce (~300ms).
- `GET /api/inbox/conversations` agrega un query param `search`, que filtra con `ilike` sobre `contact_name`, `contact_email` y `contact_phone` (combinable con los filtros de canal/estado existentes).
- No se introduce full-text search ni tooling adicional — es un filtro simple acorde al volumen de datos actual.

## Nueva conversación: modal + autocompletado

- El botón "Nueva conversación" abre un `Dialog` (el mismo componente shadcn que ya usa `start-conversation-dialog.tsx`), en vez de reemplazar el pane completo con `InboxComposer`. La lista y la conversación seleccionada permanecen visibles/intactas detrás del modal; al cerrar el modal se vuelve exactamente al mismo estado.
- Dentro de `ConversationForm`, el campo de contacto/cliente se convierte en un combobox que busca en `GET /api/clients?q=` (mismo endpoint que ya usa `link-client-dialog.tsx`) a medida que se escribe. Al seleccionar un resultado, autocompleta nombre y teléfono/email y guarda `linked_client_id` desde la creación. Si la persona no es cliente (prospecto), se puede seguir escribiendo libremente como hasta ahora.
- Las reglas existentes no cambian: WhatsApp requiere plantilla aprobada de Meta para primer contacto; email requiere cuenta + asunto + cuerpo.

## Cambios técnicos (resumen)

| Archivo | Cambio |
|---|---|
| `app/api/inbox/conversations/[id]/notes/route.ts` | Agregar `PATCH` y `DELETE`, restringidos a `author_user_id === usuario actual` (o admin) |
| `lib/inbox/contacts.ts` (o nuevo `lib/inbox/client-match.ts`) | Nueva función de sugerencia de cliente por teléfono normalizado |
| `app/api/inbox/conversations/[id]/route.ts` (GET) | Incluir `suggested_client` en la respuesta cuando corresponda |
| `app/api/webhooks/whatsapp/route.ts` | Quitar el auto-set de `linked_client_id` en `resolveWhatsAppConversation` |
| `app/api/inbox/users/route.ts` | Cambiar `requireRole('admin')` por autenticación simple (cualquier staff autenticado) |
| `app/api/inbox/conversations/route.ts` (GET) | Agregar filtro `search` |
| `components/messages-inbox.tsx` | Rediseño del panel derecho (secciones apiladas), integrar buscador, reemplazar toggle de `InboxComposer` por apertura de `Dialog` |
| `components/inbox/conversation-form.tsx` | Agregar combobox de cliente/contacto con autocompletado |
| Componentes nuevos | `ConversationNotes`, `ClassificationSelect`, `AssigneeSelect`, `SuggestedClientCard` (extraídos del panel para mantener `messages-inbox.tsx` manejable) |

No se requieren migraciones de esquema/DB — todas las columnas y tablas necesarias (`inbox_notes`, `classification`, `assigned_user_id`, `linked_client_id`) ya existen.

## Fuera de alcance

- `inbox_labels` / `inbox_conversation_labels` (sistema de etiquetas multi-tag): quedan sin usar. Se optó por un único campo `classification` en vez de tags múltiples.
- Campo `priority` (`low|normal|high|urgent`): no se expone en esta iteración.
- Redacción integrada sin modal (decisión revertida del spec previo, ver nota arriba).
- Cambios de RLS/autorización por casilla de email (cubiertos por el spec previo de 13-jul, no se tocan aquí salvo `inbox_notes` que hereda el acceso ya definido para `inbox_conversations`).
- Sincronización con n8n o Chatwoot (proyectos/tablas no relacionados con este módulo).

## Verificación

1. Abrir una conversación de WhatsApp cuyo teléfono coincide (con formato distinto, ej. `099 111 222` vs `+59899111222`) con un cliente existente → aparece la sugerencia, no se autovincula.
2. Confirmar la sugerencia con "Vincular" → `linked_client_id` se actualiza y la sección pasa a modo "vinculado".
3. Reasignar una conversación desde el dropdown de asignación como usuario no-admin → funciona (antes fallaba por `requireRole('admin')` en la carga de usuarios).
4. Cambiar la clasificación de una conversación y confirmar que persiste tras recargar.
5. Agregar una nota, editarla y borrarla como su autor; confirmar que otro usuario no puede editar/borrar una nota ajena (403 o control oculto).
6. Buscar por nombre/teléfono/email parcial en la lista y confirmar resultados combinados con filtros de canal/estado.
7. Abrir "Nueva conversación": el modal no oculta la lista ni la conversación seleccionada; cerrar el modal restaura el estado previo intacto.
8. Escribir un nombre en el combobox de cliente dentro del modal y confirmar que autocompleta teléfono/email y vincula `linked_client_id` al crear.
9. Crear una conversación de WhatsApp entrante nueva (webhook) y confirmar que NO se autovincula el cliente aunque el teléfono matchee exactamente — debe aparecer como sugerencia.
