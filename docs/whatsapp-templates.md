# Plantillas de WhatsApp

El catálogo `lib/inbox/whatsapp-templates.ts` configura cuatro plantillas sin variables,
disponibles desde Nueva conversación → WhatsApp. No requiere cargar filas en la
base de datos. Se conservan las plantillas adicionales registradas allí.

Configuración según las plantillas cargadas en Meta el 15 de octubre de 2026:

| Nombre exacto | Idioma | Categoría |
| --- | --- | --- |
| `consulta_pendiente` | Spanish, `es` | UTILITY |
| `retomar_conversacion` | Spanish, `es` | UTILITY |
| `documentacion_pendiente` | Spanish (ARG), `es_AR` | MARKETING |
| `novedades_consulta` | Spanish (ARG), `es_AR` | MARKETING |

Las vistas previas usan los cuerpos acordados en el catálogo. El contenido y los
botones efectivamente enviados son los aprobados en Meta. No agregar variables
ni encabezados multimedia sin adaptar también el envío.

Las opciones del catálogo son configuración local, no una confirmación de aprobación.
Las cuatro estaban en revisión en la captura. Meta debe aprobar cada plantilla
antes del envío. Respetar el idioma de cada fila: `es` y `es_AR` no son intercambiables.

No se incluye `retomar_contacto`, ya que no figura entre las plantillas cargadas.

El envío existente usa el nombre y el idioma del catálogo; los textos, encabezados
estáticos y botones los entrega Meta desde la plantilla aprobada. No se envía un
mensaje libre adicional fuera de la ventana de atención.

## Desde un chat existente

Escribir `/` en el campo de respuesta de WhatsApp abre el catálogo. Continuar
escribiendo filtra por nombre o título. Las flechas recorren las opciones, Enter
selecciona y Escape cierra la lista; también se puede seleccionar con un toque.
La selección muestra una vista previa y requiere pulsar Enviar. Quitar permite
volver al mensaje libre. Las plantillas se envían solas, sin archivos adicionales.

El endpoint de respuesta acepta `template_id`, verifica el acceso a la conversación
y resuelve nombre, idioma y cuerpo en el servidor. Conserva el historial y los
estados de envío, incluidos los intentos fallidos. Meta valida la disponibilidad
de la plantilla; aparecer en el catálogo no confirma su aprobación.
