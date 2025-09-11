# Integración con Chatwoot - Guía Completa

Esta documentación te guiará a través del proceso completo de integración de Chatwoot con tu aplicación legal-studio-app usando webhooks.

## ¿Por qué Chatwoot con Webhooks?

Los **webhooks de Chatwoot** te permiten:
- ✅ Recibir notificaciones en tiempo real de nuevas conversaciones
- ✅ Procesar automáticamente mensajes de clientes
- ✅ Integrar datos directamente en tu sistema legal
- ✅ Crear casos automáticamente desde conversaciones
- ✅ Mantener un historial completo de comunicaciones

## Arquitectura de la Integración

```
Chatwoot → Webhook → legal-studio-app → Base de Datos → Dashboard React
```

## Configuración Paso a Paso

### 1. Preparar tu Base de Datos

Primero, ejecuta el script SQL para crear las tablas necesarias:

```bash
# Ejecuta el script SQL en tu base de datos Supabase
psql -d your_database < sql/06-chatwoot-integration.sql
```

Las tablas creadas son:
- `chatwoot_conversations` - Almacena conversaciones
- `chatwoot_messages` - Almacena mensajes
- `chatwoot_webhook_logs` - Log de webhooks para debugging
- `chatwoot_config` - Configuración de la integración

### 2. Configurar Variables de Entorno

Añade estas variables a tu archivo `.env.local`:

```env
# Opcional: Secret para verificar webhooks de Chatwoot
CHATWOOT_WEBHOOK_SECRET=tu_secret_aqui

# URL base de tu instancia de Chatwoot (opcional, para enlaces directos)
CHATWOOT_BASE_URL=https://app.chatwoot.com
```

### 3. Configurar Webhooks en Chatwoot

1. **Accede a tu panel de Chatwoot**
   - Ve a Settings → Integrations → Webhooks

2. **Crear Nuevo Webhook**
   - URL: `https://tu-dominio.com/api/chatwoot/webhook`
   - Método: POST
   - Eventos a escuchar:
     - ✅ `conversation_created`
     - ✅ `conversation_updated` 
     - ✅ `conversation_status_changed`
     - ✅ `message_created`
     - ✅ `message_updated`
     - ✅ `contact_created`
     - ✅ `contact_updated`

3. **Configurar Seguridad (Recomendado)**
   - Genera un secret único
   - Añádelo tanto en Chatwoot como en tu `.env.local`
   - Esto garantiza que solo Chatwoot puede enviar webhooks válidos

### 4. Verificar la Configuración

Puedes probar que el webhook funciona:

```bash
# Test básico del endpoint
curl https://tu-dominio.com/api/chatwoot/webhook

# Debería responder:
# {"status":"Chatwoot webhook endpoint funcionando","timestamp":"2024-01-01T00:00:00.000Z"}
```

### **5. Integrar el Dashboard en tu App**

El dashboard ya está integrado en tu aplicación en la ruta `/dashboard/chatwoot`.

Si quieres personalizar la página, puedes editar:
```typescript
// app/dashboard/chatwoot/page.tsx
import ChatwootDashboard from '@/components/chatwoot-dashboard'

export default function ChatwootPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversaciones Chatwoot</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona las consultas y conversaciones recibidas desde Chatwoot
        </p>
      </div>
      
      <ChatwootDashboard />
    </div>
  )
}
```

## Eventos Soportados

| Evento | Descripción | Acción |
|--------|-------------|--------|
| `conversation_created` | Nueva conversación iniciada | Crea registro en BD |
| `conversation_updated` | Conversación modificada | Actualiza registro |
| `conversation_status_changed` | Estado cambiado (open/resolved/pending) | Actualiza estado |
| `message_created` | Nuevo mensaje recibido/enviado | Almacena mensaje |
| `message_updated` | Mensaje editado | Actualiza contenido |
| `contact_created` | Nuevo contacto creado | Log del evento |
| `contact_updated` | Contacto actualizado | Log del evento |

## Estructura de Datos

### Conversación
```typescript
{
  id: string,                    // UUID interno
  chatwoot_id: number,           // ID original de Chatwoot
  contact_name: string,          // Nombre del cliente
  contact_email?: string,        // Email del cliente
  contact_phone?: string,        // Teléfono del cliente
  status: 'open'|'resolved'|'pending',
  inbox_name: string,            // Canal (website, whatsapp, etc)
  assignee_name?: string,        // Agente asignado
  is_processed: boolean,         // Si ya fue procesada
  // ... más campos
}
```

### Mensaje
```typescript
{
  id: string,                    // UUID interno
  chatwoot_id: number,           // ID original de Chatwoot
  content: string,               // Contenido del mensaje
  message_type: 'incoming'|'outgoing'|'activity',
  sender_name?: string,          // Quien envió el mensaje
  attachments: any[],            // Archivos adjuntos
  // ... más campos
}
```

## Funcionalidades del Dashboard

### Panel de Estadísticas
- Total de conversaciones
- Conversaciones abiertas (requieren atención)
- Conversaciones sin procesar
- Conversaciones de hoy

### Lista de Conversaciones
- Buscar por nombre, email o canal
- Filtrar por estado (abierto, pendiente, resuelto)
- Vista detallada de cada conversación
- Marcado como "procesado"

### Detalles de Conversación
- Información completa del contacto
- Historial de mensajes en tiempo real
- Enlace directo a Chatwoot
- Marcado como procesado con notas

## Procesamiento Automático

Puedes extender la funcionalidad para:

### 1. Crear Casos Automáticamente
```typescript
// En el webhook handler, después de procesar la conversación
if (shouldCreateCase(conversation)) {
  await createCaseFromConversation(conversation)
}
```

### 2. Notificaciones en Tiempo Real
```typescript
// Enviar notificación cuando llega una conversación urgente
if (conversation.status === 'open' && isUrgent(conversation)) {
  await sendNotification({
    title: 'Nueva consulta urgente',
    message: `${conversation.contact_name} necesita atención`
  })
}
```

### 3. Integración con Sistema de Clientes
```typescript
// Vincular automáticamente con clientes existentes
const existingClient = await findClientByEmail(conversation.contact_email)
if (existingClient) {
  await linkConversationToClient(conversation.id, existingClient.id)
}
```

## Monitoreo y Debugging

### 1. Logs de Webhooks
Todos los webhooks se registran en `chatwoot_webhook_logs`:
- Evento recibido
- Estado de procesamiento
- Tiempo de procesamiento
- Errores (si los hay)
- Payload completo para debugging

### 2. Consultas Útiles
```sql
-- Webhooks con errores en las últimas 24 horas
SELECT * FROM chatwoot_webhook_logs 
WHERE status = 'error' 
AND received_at > NOW() - INTERVAL '24 hours'
ORDER BY received_at DESC;

-- Conversaciones no procesadas
SELECT * FROM chatwoot_conversations 
WHERE is_processed = false 
ORDER BY chatwoot_created_at DESC;

-- Estadísticas por canal
SELECT 
  inbox_channel_type,
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN status = 'open' THEN 1 END) as open_conversations
FROM chatwoot_conversations 
GROUP BY inbox_channel_type;
```

### 3. Verificación de Estado
```bash
# Verificar que el webhook está funcionando
curl -X GET https://tu-dominio.com/api/chatwoot/webhook

# Ver logs recientes
tail -f /var/log/your-app.log | grep chatwoot
```

## Troubleshooting

### Problema: Webhooks no se reciben
**Soluciones:**
1. Verificar que la URL del webhook sea accesible públicamente
2. Comprobar que el endpoint retorna 200 OK
3. Revisar configuración de firewall/proxy
4. Verificar logs de Chatwoot para errores de entrega

### Problema: Error de verificación de firma
**Soluciones:**
1. Verificar que `CHATWOOT_WEBHOOK_SECRET` coincida en ambos lados
2. Comprobar que el header `x-chatwoot-hmac-sha256` se envía correctamente
3. Revisar implementación de `verifyWebhookSignature()`

### Problema: Mensajes duplicados
**Soluciones:**
1. Los IDs de Chatwoot son únicos - usar `UNIQUE` constraints
2. Implementar idempotencia en el procesamiento
3. Verificar que no hay múltiples webhooks configurados para el mismo evento

### Problema: Performance lenta
**Soluciones:**
1. Optimizar queries con indexes apropiados
2. Implementar paginación en el dashboard
3. Considerar procesamiento asíncrono para webhooks complejos

## Próximos Pasos

1. **Automatización Avanzada**: Crear reglas para procesamiento automático basado en contenido
2. **Integraciones**: Conectar con sistema de facturación, calendario, etc.
3. **Analytics**: Dashboard con métricas de tiempo de respuesta, satisfacción, etc.
4. **Multi-canal**: Expandir soporte para más canales de Chatwoot (WhatsApp, Telegram, etc.)

## Soporte

Para soporte con esta integración:
1. Revisar logs en `chatwoot_webhook_logs`
2. Consultar documentación oficial de Chatwoot: https://www.chatwoot.com/docs
3. Verificar configuración de webhooks en el panel de Chatwoot

---

**¡Tu integración con Chatwoot está lista!** 🎉

Ahora puedes recibir y gestionar todas las conversaciones de Chatwoot directamente desde tu aplicación legal, con seguimiento completo y procesamiento automatizado.
