# Bandeja unificada de comunicaciones

## Objetivo

Incorporar `/dashboard/mensajes` como bandeja propia del estudio jurídico/notarial. Centraliza el número compartido de WhatsApp Business y las cuentas de correo Hostinger de los usuarios, sin Chatwoot.

## Alcance del MVP

- WhatsApp Cloud API de Meta: recepción por webhook, envío y estados de entrega.
- Email: IMAP para mensajes nuevos desde la activación y SMTP para respuestas.
- Una conversación se vincula automáticamente a un cliente por teléfono (WhatsApp) o email; si no coincide, representa una consulta de contacto no cliente.
- Administradores configuran las cuentas de correo y asignan conversaciones. Usuarios ven y responden sus conversaciones asignadas y sus correos personales.
- Se soportan texto, imágenes, documentos, audio y video. Los archivos se almacenan de forma privada y se entregan mediante URLs firmadas.
- Desde el detalle de una conversación se puede vincular un cliente o caso, clasificar la consulta y registrar notas internas.

## Arquitectura

Supabase es la fuente de verdad de conversaciones, mensajes, asignaciones y auditoría. Las rutas de servidor de Next.js administran credenciales y llamadas a Meta/IMAP/SMTP. Las credenciales de Hostinger se cifran con AES-256-GCM antes de persistirse. Los secretos de Meta y la clave de cifrado solo se exponen al servidor.

Los webhooks se validan criptográficamente, se registran para auditoría y se procesan de manera idempotente mediante los identificadores de proveedor. Las actualizaciones visibles se publican vía Supabase Realtime.

## Privacidad y permisos

- Todas las tablas de la bandeja tienen RLS.
- El administrador ve, asigna y configura todo.
- Un usuario solo consulta y responde conversaciones asignadas a él. Las conversaciones no asignadas no se exponen a usuarios regulares.
- Adjuntos y credenciales no son públicos; los archivos se obtienen con URLs firmadas de duración limitada.
- Las notas internas no salen por ningún canal externo.

## Decisiones de producto

- Un solo número de WhatsApp Business para el estudio.
- Cuentas de correo individuales, configuradas una vez por un administrador.
- No se importará historial previo: el IMAP comienza a partir de la activación de cada cuenta.
- Las personas que consultan o coordinan una cita sin ser clientes quedan identificadas como contactos de consulta hasta que se las convierta o vincule a cliente.

## Fuera del MVP inicial

- Plantillas, campañas y automatizaciones masivas de WhatsApp.
- Antivirus de adjuntos y OCR.
- Sincronización bidireccional de calendario.

