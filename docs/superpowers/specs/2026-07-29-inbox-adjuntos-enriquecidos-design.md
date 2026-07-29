# Bandeja de mensajes: adjuntos enriquecidos (audio, imagen, video, guardar en caso)

## Objetivo

Hoy `components/messages-inbox.tsx` renderiza **todo** adjunto —imagen, audio, video o documento— como el mismo link genérico con ícono de archivo (`<FileText />`), aunque `content_type` ya distingue esos cuatro tipos tanto para mensajes entrantes (seteado por el webhook en `app/api/webhooks/whatsapp/route.ts`) como salientes (seteado por `mime_type` en `app/api/inbox/conversations/[id]/reply/route.ts`). El backend de WhatsApp Cloud API (`lib/inbox/whatsapp.ts`) ya sabe subir y enviar cualquier tipo de media — el hueco es enteramente de UI/UX.

Este spec agrega, con estilo inspirado en Apple (iMessage clásico: burbujas compactas con cola, alto contraste):

1. Grabar y enviar notas de voz desde el composer (solo WhatsApp).
2. Reproductor de audio con forma de onda para notas de voz entrantes y salientes.
3. Vista previa inline de imágenes/video en el chat + visor a pantalla completa (lightbox) con navegación entre los adjuntos multimedia de la conversación.
4. Acción "Guardar como documento del caso" sobre cualquier adjunto, reutilizando el módulo de documentos existente (`documents` table, bucket `documents`).
5. Drag & drop y pegado (Cmd/Ctrl+V) de archivos/imágenes en el composer.
6. Compresión client-side de imágenes que superan el límite de Meta antes de subir.

No se agregan dependencias nuevas: grabación con `MediaRecorder`, waveform con `AudioContext.decodeAudioData` + `<canvas>`, lightbox con el `Dialog` de Radix que ya usa el resto del proyecto.

## Arquitectura: componentes nuevos

`components/messages-inbox.tsx` (hoy ~700 líneas) se parte en subcomponentes de una sola responsabilidad, todos en `components/inbox/`:

| Componente | Responsabilidad |
|---|---|
| `message-bubble.tsx` | Burbuja de texto + hora + check de leído (extraído del render inline actual de `visibleMessages.map(...)`). Envuelve `MessageAttachment` cuando el mensaje tiene adjuntos. |
| `message-attachment.tsx` | Recibe `attachment` + `content_type` y decide el render: `image` → `ImageAttachment`, `video` → `VideoAttachment`, `audio` → `AudioWavePlayer`, `document`/otro → tarjeta actual (ícono + nombre + tamaño). Muestra el chip "Guardar en caso" si `selected.linked_client_id` no es null. |
| `image-attachment.tsx` | Thumbnail 210×130 con `object-cover`, `border-radius` 16px (cola 4px del lado del emisor). Click abre `MediaLightbox`. |
| `video-attachment.tsx` | `<video>` inline con `poster` (primer frame capturado con un `<canvas>` oculto al cargar metadata) y controles nativos; click en el poster abre `MediaLightbox`. |
| `audio-wave-player.tsx` | Reproductor de nota de voz. Descarga el audio desde `/api/inbox/attachments/[id]` (mismo endpoint que ya redirige a URL firmada), lo decodifica con `AudioContext.decodeAudioData`, calcula ~40 picos de amplitud y los dibuja en `<canvas>`. Un `<audio>` oculto controla play/pause/seek; el progreso se refleja pintando los picos ya reproducidos en el color de acento. Si la decodificación falla (códec no soportado), cae a un `<audio controls>` nativo simple. |
| `audio-recorder-button.tsx` | Botón de micrófono en el composer. Estados: `idle` → `recording` (onda en vivo vía `AnalyserNode`, timer) → `review` (blob grabado, se puede reproducir/descartar/enviar) → vuelve a `idle`. Solo se monta si `selected.channel === 'whatsapp'` y `navigator.mediaDevices?.getUserMedia` + `window.MediaRecorder` existen. |
| `media-lightbox.tsx` | `Dialog` de Radix a pantalla completa (fondo oscuro `#17140f`), recibe la lista de adjuntos `image`/`video` de `visibleMessages` + el índice clickeado. Flechas izq/der y swipe (touch) para navegar, botón descargar, botón "Guardar en caso", cierra con `Esc`/click afuera. |
| `save-to-case-dialog.tsx` | Al confirmar el chip "Guardar en caso": trae los casos del cliente vinculado (`GET /api/cases?client_id=...`, endpoint existente — ya soporta ese filtro), selector de caso + `<select>` de `document_type` (mismo enum que `document-viewer.tsx` ya traduce: `contract`, `brief`, `evidence`, `correspondence`, `court_filing`, `other`) + descripción opcional. Si el cliente no tiene casos, muestra estado vacío con link a "Crear caso". |
| `composer-attachment-tray.tsx` | Reemplaza los `Badge` actuales de `files.map(...)`: thumbnails para imágenes, ícono para el resto, nombre, tamaño, botón quitar. |

`messages-inbox.tsx` sigue siendo el orquestador: estado de conversaciones/mensajes, fetch, Realtime (sin cambios en esa lógica), y ahora delega el render de cada mensaje a `MessageBubble`.

## Backend

**Sin endpoints nuevos salvo uno.** Todo lo demás reutiliza rutas existentes:

- `POST /api/inbox/attachments/[id]/save-to-case` (nuevo) — body `{ caseId: string, documentType: string, description?: string }`.
  1. Autentica con `createClient()` (RLS), busca el `inbox_attachments` por `id` con join a `inbox_messages.conversation_id` para confirmar que el usuario tiene acceso a esa conversación (mismo patrón de autorización que `app/api/inbox/attachments/[id]/route.ts`).
  2. Confirma que `caseId` pertenece a un caso del `linked_client_id` de la conversación (evita guardar en un caso ajeno).
  3. Con `createServiceClient()`: descarga el archivo del bucket `inbox-attachments` (mismo mecanismo que `getSignedInboxAttachmentUrl`/`storeInboxAttachment` en `lib/inbox/attachments.ts`), lo sube al bucket `documents` bajo `${userId}/${caseId}/${timestamp}-${filename}` (mismo esquema de path que ya usa `app/api/cases/[id]/documents/route.ts`), e inserta la fila en `documents` (`name`, `file_path`, `file_size`, `mime_type`, `document_type`, `description`, `case_id`, `uploaded_by`).
  4. Es una **copia**, no un move: el adjunto sigue intacto en el historial del chat.
- `GET /api/cases?client_id=X` — ya existe (`app/api/cases/route.ts:25`), no requiere cambios.
- Envío de audio/imagen/video/documento por WhatsApp — ya funciona end-to-end vía `app/api/inbox/conversations/[id]/reply/route.ts` (sube a `inbox-attachments`, luego `uploadWhatsAppMedia` + `sendWhatsAppMedia` según `mime_type`). Las notas de voz grabadas se envían por ese mismo camino, como un `File` más.

**Sin migraciones de esquema.** Duración y picos de waveform se calculan al vuelo en el cliente (no se persisten); no hacía falta agregar columnas a `inbox_attachments`.

## Límites y validación

- Antes de subir, se valida el tamaño contra los límites reales de Meta según tipo (no el tope parejo de 50MB del bucket que se usa hoy):
  - Imagen: 5MB (con compresión automática, ver abajo).
  - Video: 16MB.
  - Audio: 16MB.
  - Documento: 100MB.
- Si un archivo supera el límite de su tipo y no aplica compresión, se bloquea el envío client-side con un mensaje puntual ("Los videos no pueden superar 16MB") antes de llamar a `upload-url`.
- Imágenes que superan 5MB se redimensionan/recomprimen con `<canvas>` (mantiene proporción, baja calidad JPEG iterativamente hasta entrar en el límite) y se reemplaza el `File` antes de subir. Video/audio/documento no se comprimen.
- Notas de voz sin tope estricto de duración (16MB en opus ≈ horas); aviso no bloqueante a partir de 10 minutos sugiriendo enviarlo como archivo en su lugar.

## Drag & drop y paste

- El panel de chat (`<main>` en `messages-inbox.tsx`) gana `onDragOver`/`onDrop`: soltar archivos los agrega al mismo estado `files` que ya alimenta el composer, con overlay de borde punteado mientras se arrastra.
- El `<Textarea>` del composer gana `onPaste`: si `clipboardData.items` contiene una imagen, se agrega a `files` igual que si se hubiera elegido a mano; pegar texto sigue funcionando sin cambios.

## Comportamiento por canal

- El botón de grabar audio (`audio-recorder-button.tsx`) solo se muestra cuando `selected.channel === 'whatsapp'` — es una capacidad de Meta, no de email.
- Vista previa de imagen/video, waveform de audio y "Guardar en caso" funcionan igual en ambos canales: un adjunto de email también puede ser una foto o un audio.

## Manejo de errores

- Permiso de micrófono denegado → mensaje inline junto al composer; no rompe el resto de la UI.
- `MediaRecorder`/`getUserMedia` no soportados → el botón de mic no se monta (feature-detect en `audio-recorder-button.tsx`).
- Grabación interrumpida (dispositivo desconectado) → se descarta con un toast (`sonner`, ya usado en el proyecto), vuelve a `idle`.
- Envío a Meta falla (ya lo maneja `reply/route.ts` marcando `wa_status: 'failed'`) → `MessageAttachment` respeta ese estado visualmente en imagen/audio/video, no solo en texto como hoy.
- Adjunto que no carga (URL firmada vencida, archivo borrado) → `ImageAttachment`/`VideoAttachment`/`AudioWavePlayer` muestran un estado roto con botón reintentar, no un ícono roto de navegador.
- Waveform no decodificable → fallback a `<audio controls>` nativo, no rompe el resto de la lista de mensajes.
- `save-to-case-dialog` sin casos para el cliente → estado vacío con link a crear caso.
- Doble clic en "Guardar en caso" → el botón se deshabilita mientras la request está en vuelo (estado local, no persistido — permite guardar el mismo adjunto en más de un caso si corresponde).

## Fuera de alcance

- Stickers, ubicación, contactos, reacciones a mensajes de WhatsApp (tipos de mensaje de Meta no contemplados en `content_type` hoy).
- Edición/recorte de imagen o video antes de enviar (más allá de la compresión automática).
- Transcripción automática de notas de voz.
- Persistir duración/waveform en base de datos — se recalcula en cliente cada vez.
- Cambios al sistema de Realtime o de reconciliación de la bandeja (cubierto por specs previos: `2026-07-23-inbox-whatsapp-realtime-publication-design.md`, `2026-07-24-inbox-realtime-heartbeat-design.md`).
- Integración de Chatwoot (`components/chatwoot-dashboard.tsx`, `/dashboard/chatwoot`) — es un panel separado, no relacionado a esta bandeja.

## Cambios técnicos (resumen)

| Archivo | Cambio |
|---|---|
| `components/messages-inbox.tsx` | Extraer render de mensajes a `MessageBubble`; agregar drag&drop en el panel de chat y `onPaste` en el `Textarea`; reemplazar tray de `Badge` por `ComposerAttachmentTray`; ocultar mic si `channel !== 'whatsapp'` |
| `components/inbox/message-bubble.tsx` | Nuevo |
| `components/inbox/message-attachment.tsx` | Nuevo |
| `components/inbox/image-attachment.tsx` | Nuevo |
| `components/inbox/video-attachment.tsx` | Nuevo |
| `components/inbox/audio-wave-player.tsx` | Nuevo |
| `components/inbox/audio-recorder-button.tsx` | Nuevo |
| `components/inbox/media-lightbox.tsx` | Nuevo |
| `components/inbox/save-to-case-dialog.tsx` | Nuevo |
| `components/inbox/composer-attachment-tray.tsx` | Nuevo |
| `lib/inbox/image-compression.ts` | Nuevo — helper de compresión con `<canvas>` |
| `app/api/inbox/attachments/[id]/save-to-case/route.ts` | Nuevo endpoint `POST` |

No se requieren migraciones de esquema/DB.

## Verificación

1. `npm run typecheck` y `npm run build` pasan sin errores (no hay suite de tests automatizados en este proyecto — `package.json` solo define `typecheck`/`lint`/`build`).
2. En una conversación de WhatsApp de prueba: grabar una nota de voz, escucharla en el estado de revisión, enviarla, y confirmar que llega por WhatsApp real y se ve con waveform en ambos lados (enviado/recibido).
3. Enviar una imagen pesada (>5MB) y confirmar que se comprime antes de subir y llega por debajo de 5MB.
4. Intentar enviar un video de más de 16MB y confirmar que se bloquea client-side con el mensaje de límite, sin llegar a golpear la API.
5. Abrir una imagen y un video recibidos en el lightbox, navegar entre adjuntos de la conversación con flechas y swipe, y descargar uno.
6. Desde el lightbox y desde la burbuja, usar "Guardar en caso": elegir un caso real del cliente vinculado, confirmar que el documento aparece en `/dashboard/cases/[id]` con el `document_type` correcto, y que el adjunto original sigue visible en el chat.
7. Repetir "Guardar en caso" con un cliente sin casos y confirmar el estado vacío con link a crear caso.
8. Arrastrar un archivo sobre el panel de chat y confirmar que se agrega a la bandeja de adjuntos pendientes; pegar una captura de pantalla con Cmd/Ctrl+V y confirmar lo mismo.
9. Abrir una conversación de email y confirmar que el botón de grabar audio no aparece, pero que imagen/video/audio/documento adjuntos igual se ven enriquecidos y se pueden guardar en caso.
10. Denegar el permiso de micrófono en el navegador y confirmar que se muestra el aviso inline sin romper el composer.
