# 🔔 Sistema de Notificaciones - Guía Rápida

## ¿Qué se implementó?

Sistema de notificaciones en tiempo real que alerta a los usuarios sobre tareas próximas a vencer, con insistencia basada en la prioridad de cada tarea.

### Características

✅ **Notificaciones en tiempo real** via Server-Sent Events (SSE)
✅ **Alertas según prioridad**: Urgente, Alta, Media, Baja
✅ **Insistencia inteligente**: Las tareas urgentes notifican cada 30 min
✅ **Indicadores visuales**: Colores según urgencia en el header
✅ **Notificaciones del navegador**: Con permiso del usuario
✅ **Reconexión automática**: Si se pierde la conexión

## Configuración de Prioridades

| Prioridad | Notificaciones |
|-----------|----------------|
| **Urgente** | 30min, 1h, 2h, 4h, 8h, 12h, 24h, 48h antes |
| **Alta** | 1h, 4h, 12h, 24h, 48h, 72h antes |
| **Media** | 4h, 24h, 48h, 72h antes |
| **Baja** | 24h, 72h, 168h (1 semana) antes |

## Cómo probarlo

### 1. Agregar CRON_SECRET al .env.local

```bash
echo "CRON_SECRET=mi-secreto-super-seguro-123" >> .env.local
```

### 2. Iniciar el servidor

```bash
npm run dev
```

### 3. Crear una tarea de prueba

1. Inicia sesión en la aplicación
2. Ve a "Tareas" → "Nueva tarea"
3. Crea una tarea con:
   - **Título**: "Prueba de notificación"
   - **Usuario asignado**: Tu usuario
   - **Fecha de vencimiento**: En 2 horas desde ahora
   - **Prioridad**: Urgente o Alta

### 4. Ejecutar el scheduler manualmente

Abre una nueva terminal y ejecuta:

```bash
./scripts/run-notification-scheduler.sh
```

Deberías ver algo como:
```
🔔 Ejecutando scheduler de notificaciones...
📍 Servidor: http://localhost:3000

✅ Scheduler ejecutado exitosamente
{
  "success": true,
  "message": "Revisadas 1 tareas, enviadas 1 notificaciones",
  "total": 1,
  "sent": 1
}
```

### 5. Ver la notificación

- **En el header**: Verás un badge rojo con el número de notificaciones
- **En el navegador**: Si diste permisos, aparecerá una notificación nativa
- **En la consola**: Verás el log "🔔 Conectado al servidor de notificaciones"

### 6. Configurar ejecución automática (opcional)

Para que las notificaciones se envíen automáticamente cada 5 minutos:

```bash
# Editar crontab
crontab -e

# Agregar esta línea (ajustar la ruta)
*/5 * * * * /home/fran/Documents/DTE/DEV/Centro\ de\ Asesoramiento/legal-studio-app/scripts/run-notification-scheduler.sh >> /tmp/notification-scheduler.log 2>&1
```

## Visualización en el Header

El icono de campana muestra:

- 🔴 **Badge rojo pulsante**: Número de notificaciones sin leer
- 🟢 **Punto verde pulsante**: Conectado al servidor SSE
- ⚪ **Sin punto**: Desconectado (reconectando)

### Colores de urgencia

- 🔴 **Rojo**: Crítico (< 1 hora)
- 🟠 **Naranja**: Alto (< 12 horas + urgente/alta)
- 🟡 **Amarillo**: Medio (< 24 horas)
- 🔵 **Azul**: Bajo (> 24 horas)

## Solución de Problemas

### No aparecen notificaciones

1. Verifica que estés autenticado
2. Verifica que la tarea tenga usuario asignado (`assigned_to`)
3. Verifica que `due_date` esté dentro de la próxima semana
4. Ejecuta el scheduler manualmente para ver logs
5. Abre la consola del navegador y busca errores

### Desconexión constante de SSE

- Verifica que no haya proxies cerrando conexiones largas
- El sistema reconecta automáticamente cada 5 segundos

### El scheduler no encuentra tareas

Verifica en la BD:
```sql
SELECT id, title, due_date, assigned_to, priority, status 
FROM tasks 
WHERE assigned_to IS NOT NULL 
  AND status NOT IN ('completed', 'cancelled')
  AND due_date >= NOW() 
  AND due_date <= NOW() + INTERVAL '7 days'
  AND deleted_at IS NULL;
```

## Archivos Principales

```
app/
  api/
    notifications/
      stream/route.ts          # Endpoint SSE
      check/route.ts           # Ejecutar scheduler
      route.ts                 # API tradicional (fallback)
      
lib/
  notification-scheduler.ts    # Lógica del scheduler
  sse-connections.ts          # Gestión de conexiones SSE
  
hooks/
  use-notifications.ts        # Hook React para notificaciones
  
components/
  notification-dropdown.tsx   # UI en el header
  
scripts/
  run-notification-scheduler.sh  # Script para ejecutar scheduler
```

## Para más información

Ver documentación completa en: `docs/NOTIFICACIONES.md`
