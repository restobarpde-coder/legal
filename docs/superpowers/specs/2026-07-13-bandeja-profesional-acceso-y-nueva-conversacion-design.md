# Bandeja profesional: acceso por casilla y nueva conversación integrada

## Objetivo

Convertir la bandeja unificada en el centro profesional de trabajo para WhatsApp y email. La bandeja debe permitir iniciar conversaciones desde la misma interfaz, sin modal, y aplicar aislamiento real por cuenta de correo:

- Un usuario común ve sus casillas personales, las casillas compartidas y el WhatsApp del estudio.
- Un administrador ve todas las casillas, todas las conversaciones y WhatsApp.
- Una cuenta personal nunca queda visible para otro usuario común, aunque la conversación no tenga asignación manual.
- Una cuenta compartida es visible para todos los usuarios autorizados.

## Experiencia de usuario

### Bandeja

Se mantiene la distribución profesional de tres paneles:

1. Lista de conversaciones con búsqueda, filtros y etiquetas de cuenta.
2. Conversación seleccionada con historial, respuesta, adjuntos y cambio de estado.
3. Panel de contexto con contacto, vinculación, prioridad, etiquetas, asignación y notas.

El botón `Nueva conversación` cambia la bandeja a un estado de redacción dentro del panel central. No abre `Dialog` ni bloquea la navegación con un overlay. La lista y el panel contextual permanecen visibles en desktop; en mobile se muestra la redacción como vista interna con botón de regreso.

Al cancelar, se recuperan el filtro, la conversación seleccionada y la posición lógica de la bandeja. Al enviar, se crea la conversación, se agrega el primer mensaje y se selecciona el hilo recién creado.

### Redacción de email

La vista integrada incluye:

- Selector de casilla remitente, mostrando solo cuentas permitidas para el usuario.
- Destinatario obligatorio.
- CC y CCO opcionales.
- Asunto obligatorio.
- Editor multilinea para el mensaje.
- Adjuntos con validación de tamaño y tipo según los límites existentes.
- Firma asociada a la casilla, cuando exista.
- Indicador visible de cuenta personal, compartida o WhatsApp.

El botón de envío muestra estados de carga, éxito y error sin cerrar la bandeja automáticamente si el envío falla.

### Redacción de WhatsApp

La misma vista permite seleccionar contacto, número y plantilla aprobada de Meta. El primer contacto conserva la obligación de usar una plantilla. La interfaz muestra el motivo cuando no hay plantillas o el canal no está disponible.

## Autorización y flujo de datos

La fuente de autorización será la combinación de usuario autenticado, rol y cuenta de email:

```text
admin                         -> todas las cuentas + WhatsApp
usuario + cuenta personal     -> su cuenta personal
usuario + cuenta compartida   -> cuenta compartida
WhatsApp                      -> todos los usuarios autorizados
```

El acceso a conversaciones se resolverá en Supabase/RLS usando `email_account_id`, `inbox_email_accounts.user_id` y `account_type`. Para WhatsApp se utilizará la regla común del estudio. Las rutas de Next.js repetirán la validación antes de listar, crear, leer mensajes, responder, cambiar estado, asignar o descargar adjuntos.

La asignación (`assigned_user_id`) seguirá siendo una herramienta operativa y no reemplazará la visibilidad por casilla. Un usuario podrá trabajar una conversación de una cuenta compartida aunque no sea el asignado, de acuerdo con el flujo de asignaciones definido para esa cuenta. Las conversaciones de una cuenta personal solo serán accesibles por su propietario o por un administrador.

Las respuestas de email deberán comprobar que la cuenta remitente pertenece al usuario o es compartida; nunca se confiará en un `email_account_id` enviado desde el navegador. El servidor resolverá las cuentas permitidas y rechazará cualquier cuenta ajena con `403`.

## Cambios técnicos previstos

- Sustituir el estado/modal de `NewConversationDialog` por un componente de redacción integrado en `MessagesInbox`.
- Ampliar el endpoint de conversaciones para devolver metadatos de cuenta visibles y aceptar la creación con la cuenta validada en servidor.
- Ajustar las consultas de bandeja para eliminar el comportamiento global `assigned=all` en usuarios comunes.
- Revisar `messages`, `reply`, `assign`, `attachments` y cualquier endpoint de email para aplicar la misma autorización.
- Añadir una migración SQL que reemplace las políticas de RLS actuales por políticas basadas en propietario, cuenta compartida, WhatsApp y administrador.
- Mantener credenciales y operaciones IMAP/SMTP exclusivamente en servidor.
- Suscribir Realtime a cambios de conversaciones y mensajes sin permitir que el cliente use eventos para saltarse RLS.

## Estados y errores

- Sin sesión: `401`.
- Usuario sin permiso sobre conversación o cuenta: `403`.
- Cuenta inexistente, inactiva o no permitida: `400`/`403` según el caso.
- Error de proveedor: conservar el borrador, mostrar el error y registrar el intento de entrega.
- Doble envío: deshabilitar el botón durante la operación y mantener idempotencia del proveedor cuando aplique.
- Cuenta compartida sin configuración de envío: mostrarla como no disponible para enviar, sin ocultar las conversaciones recibidas.

## Verificación

Se probarán al menos estos escenarios:

1. Usuario A no puede listar, abrir, responder ni descargar adjuntos de la cuenta personal de B.
2. Usuario A sí puede ver y responder una cuenta compartida.
3. Usuario A y B ven WhatsApp.
4. El administrador ve cuentas personales, compartidas y WhatsApp.
5. Crear email desde la bandeja integrada no abre modal, conserva filtros y selecciona el hilo creado.
6. Crear WhatsApp mantiene la selección obligatoria de plantilla.
7. Un intento de manipular `email_account_id` desde el navegador recibe `403`.
8. Se ejecutan lint, typecheck/build y pruebas de rutas/RLS disponibles.

## Fuera de alcance

- Bandejas de terceros adicionales.
- Campañas masivas.
- Editor HTML avanzado si el envío actual es texto plano.
- Cambios en la lógica de sincronización histórica de IMAP, salvo los necesarios para asociar correctamente la cuenta.
