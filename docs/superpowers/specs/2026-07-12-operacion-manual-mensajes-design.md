# Operación manual de la bandeja de mensajes

## Objetivo

Completar la bandeja unificada para que el estudio pueda iniciar comunicaciones, gestionar contactos, configurar correo y convertir consultas en actividad del estudio sin depender de la base de datos ni de endpoints manuales.

## Rutas

- `/dashboard/messages`: operación diaria.
- `/dashboard/messages/settings`: configuración exclusiva de administradores.

## Operación diaria

La bandeja incorpora un botón **Nueva conversación**.

- **WhatsApp:** solicita contacto, número internacional y plantilla aprobada de Meta. El sistema crea o reutiliza el contacto, permite vincular un cliente y crea una conversación asignable. El primer mensaje comercial/proactivo siempre se envía mediante plantilla; el texto libre se habilita dentro de la ventana de atención iniciada por el cliente.
- **Email:** solicita cuenta remitente, destinatario, asunto, cuerpo y adjuntos. Puede vincular un cliente existente o conservarse como consulta de prospecto.

El detalle de conversación permite asignar responsable, vincular/crear cliente, modificar prioridad y clasificación, administrar etiquetas, crear notas internas y crear una cita vinculada.

## Configuración

Solo los administradores pueden crear, modificar, probar o desactivar una cuenta Hostinger. Una cuenta personal se asigna a un usuario de la plataforma y una cuenta compartida queda disponible al equipo. La contraseña se recibe una vez, se cifra del lado del servidor y nunca se devuelve al navegador.

La página muestra estado de sincronización IMAP, últimos errores y una acción de sincronización manual. También documenta las variables y datos que Meta requiere para registrar el webhook.

## Datos y permisos

Se añaden plantillas de WhatsApp y citas vinculadas a conversación, además de las tablas de contactos, etiquetas y notas ya definidas. Los usuarios solo pueden operar sobre conversaciones propias; administración de cuentas, asignaciones y plantillas corresponde a administradores.

## Entorno y verificación

Se agrega `.env.example` con Supabase, cifrado de inbox, Meta WhatsApp y parámetros de sincronización. Antes de producción se verifican: creación de conversación por cada canal, permisos, envío SMTP, sincronización IMAP, bloqueo de mensaje WhatsApp proactivo no basado en plantilla y creación de cita.
