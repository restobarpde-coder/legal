# Sistema de Notificaciones en Tiempo Real

Este documento describe el sistema de notificaciones push en tiempo real implementado para alertar a los usuarios sobre tareas próximas a vencer.

## Arquitectura

El sistema utiliza **Server-Sent Events (SSE)** para establecer conexiones persistentes entre el servidor y los clientes, permitiendo enviar notificaciones en tiempo real sin necesidad de polling.

### Componentes principales

1. **Backend SSE** (`/app/api/notifications/stream/route.ts`)
   - Mantiene conexiones WebSocket-like con los clientes
   - Gestiona un Map de conexiones activas por usuario
   - Envía pings cada 30 segundos para mantener la conexión viva
   - Reconexión automática en caso de desconexión

2. **Scheduler** (`/lib/notification-scheduler.ts`)
   - Revisa periódicamente las tareas próximas a vencer
   - Determina qué notificaciones enviar según prioridad y tiempo restante
   - Calcula niveles de urgencia para la UI

3. **Hook de React** (`/hooks/use-notifications.ts`)
   - Conecta al stream SSE
   - Gestiona el estado de notificaciones en el cliente
   - Muestra notificaciones del navegador (si está permitido)
   - Reconexión automática con backoff

4. **Componente UI** (`/components/notification-dropdown.tsx`)
   - Muestra las notificaciones en el header
   - Indicadores visuales según prioridad
   - Permite marcar como leídas individualmente o limpiar todas

## Configuración de Prioridades

Las notificaciones se envían según la prioridad de la tarea y el tiempo hasta el vencimiento:

### Urgente
- **30 minutos antes**: ⚠️ Notificación crítica
- **1, 2, 4 horas antes**: Recordatorios frecuentes
- **8, 12 horas antes**: Recordatorios regulares
- **24, 48 horas antes**: Alertas tempranas

### Alta
- **1, 4 horas antes**: Recordatorios frecuentes
- **12, 24 horas antes**: Recordatorios regulares
- **48, 72 horas antes**: Alertas tempranas

### Media
- **4 horas antes**: Recordatorio cercano
- **24, 48, 72 horas antes**: Alertas con anticipación

### Baja
- **24 horas antes**: 1 día de anticipación
- **72 horas antes**: 3 días de anticipación
- **168 horas antes**: 1 semana de anticipación

## Niveles de Urgencia en UI

Las notificaciones se muestran con diferentes colores según la urgencia:

- 🔴 **Crítico** (rojo): < 1 hora o < 4 horas + urgente
- 🟠 **Alto** (naranja): < 12 horas + (urgente o alta)
- 🟡 **Medio** (amarillo): < 24 horas
- 🔵 **Bajo** (azul): > 24 horas

## Configuración

### Variables de entorno

Agrega a tu `.env.local`:

```bash
# Secret para proteger el endpoint del scheduler (requerido para producción)
CRON_SECRET=tu-secreto-muy-seguro-aqui
```

### Ejecutar el scheduler

#### Manualmente (para testing)
```bash
./scripts/run-notification-scheduler.sh
```

#### Con cron job (producción)
```bash
# Editar crontab
crontab -e

# Agregar línea para ejecutar cada 5 minutos
*/5 * * * * /ruta/completa/al/proyecto/scripts/run-notification-scheduler.sh >> /var/log/notification-scheduler.log 2>&1
```

#### Con servicios de cron externos
Para aplicaciones desplegadas en plataformas cloud:

**Vercel Cron Jobs** (vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/notifications/check",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**GitHub Actions** (.github/workflows/notification-cron.yml):
```yaml
name: Notification Scheduler
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger notification check
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://tu-dominio.com/api/notifications/check
```

## Testing

### 1. Crear una tarea de prueba
Crea una tarea con:
- Usuario asignado
- Fecha de vencimiento en las próximas horas
- Prioridad: urgente o alta

### 2. Verificar conexión SSE
Abre el navegador y la consola de desarrollador. Deberías ver:
```
🔔 Conectado al servidor de notificaciones
```

### 3. Ejecutar el scheduler manualmente
```bash
./scripts/run-notification-scheduler.sh
```

### 4. Verificar notificación
- Deberías ver la notificación aparecer en el dropdown del header
- Si diste permisos, también aparecerá como notificación del navegador

## Endpoints API

### GET /api/notifications/stream
Stream SSE para recibir notificaciones en tiempo real.

**Autenticación**: Requiere sesión activa

**Response**: Stream de eventos SSE
```javascript
// Mensaje de conexión
data: {"type":"connected","message":"Conectado al servidor de notificaciones"}

// Ping (cada 30 segundos)
data: {"type":"ping"}

// Notificación de tarea
data: {
  "type": "task_reminder",
  "taskId": "uuid",
  "taskTitle": "Presentar documentos",
  "taskDescription": "Descripción de la tarea",
  "priority": "urgent",
  "dueDate": "2025-11-21T10:00:00Z",
  "caseId": "uuid",
  "hoursUntilDue": 2,
  "urgencyLevel": "high"
}
```

### POST /api/notifications/check
Ejecuta el scheduler manualmente para revisar y enviar notificaciones.

**Autenticación**: Header `Authorization: Bearer <CRON_SECRET>`

**Response**:
```json
{
  "success": true,
  "message": "Revisadas 5 tareas, enviadas 3 notificaciones",
  "total": 5,
  "sent": 3
}
```

### GET /api/notifications
Obtiene notificaciones actuales (método tradicional, usado como fallback).

**Autenticación**: Requiere sesión activa

**Response**:
```json
{
  "notifications": [
    {
      "id": "task-uuid",
      "type": "task",
      "title": "Presentar documentos",
      "dueDate": "2025-11-21",
      "caseId": "uuid"
    }
  ]
}
```

## Monitoreo

### Logs del servidor
Las notificaciones generan logs útiles:
```
📅 Scheduler: Revisando 5 tareas para notificación
✉️ Scheduler: Enviadas 3 notificaciones
```

### Indicador de conexión
El icono de la campana en el header muestra:
- Punto verde pulsante: Conectado al SSE
- Sin punto: Desconectado (intentando reconectar)
- Badge con número: Cantidad de notificaciones no leídas

## Troubleshooting

### Las notificaciones no llegan
1. Verificar que el usuario esté autenticado
2. Verificar que haya tareas asignadas próximas a vencer
3. Revisar que el scheduler se esté ejecutando
4. Verificar la consola del navegador para errores SSE

### Conexión SSE se desconecta constantemente
- Verificar timeouts del servidor web (nginx, Apache)
- Asegurar que no haya proxies intermedios cerrando conexiones largas
- El sistema reconecta automáticamente cada 5 segundos

### El scheduler no encuentra tareas
- Verificar que las tareas tengan `assigned_to` configurado
- Verificar que `due_date` esté dentro de la próxima semana
- Verificar que `deleted_at` sea null
- Revisar que el estado no sea 'completed' ni 'cancelled'

## Próximas mejoras

- [ ] Almacenar notificaciones en base de datos para persistencia
- [ ] Agregar preferencias de notificación por usuario
- [ ] Soporte para notificaciones de otros tipos (comentarios, menciones)
- [ ] Notificaciones por email para usuarios offline
- [ ] Panel de administración de notificaciones
- [ ] Estadísticas de entrega y lectura
