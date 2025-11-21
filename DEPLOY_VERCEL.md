# 🚀 Despliegue en Vercel con Notificaciones Automáticas

## Pasos para desplegar

### 1. Preparar el repositorio

```bash
# Asegúrate de que todos los cambios estén commiteados
git add .
git commit -m "Agregar sistema de notificaciones con Vercel Cron"
git push
```

### 2. Importar proyecto en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en **"Add New Project"**
3. Importa tu repositorio de GitHub
4. Configura las variables de entorno:

### 3. Variables de entorno en Vercel

En la configuración del proyecto, agrega estas variables:

```bash
# Supabase (requerido)
NEXT_PUBLIC_SUPABASE_URL=https://wijlqlbubzljtraipipr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui

# Cron secret (recomendado para seguridad adicional)
CRON_SECRET=mi-secreto-super-seguro-123
```

**Importante**: Copia estos valores desde tu `.env.local`

### 4. Despliega

Haz clic en **"Deploy"**. Vercel automáticamente:
- ✅ Detectará que es un proyecto Next.js
- ✅ Instalará las dependencias
- ✅ Construirá el proyecto
- ✅ Configurará el Cron Job automáticamente (por el `vercel.json`)

### 5. Verificar el Cron Job

Una vez desplegado:

1. Ve a tu proyecto en Vercel
2. Haz clic en **"Settings"** → **"Cron Jobs"**
3. Deberías ver:
   ```
   Path: /api/notifications/check
   Schedule: 0 0 * * * (Note: For Vercel Hobby accounts, cron jobs are limited to once a day. The schedule '0 0 * * *' runs daily at midnight.)
   Status: Active
   ```

### 6. Probar el sistema

#### A. Verificar endpoint manualmente

```bash
curl -X POST https://tu-app.vercel.app/api/notifications/check \
  -H "Authorization: Bearer tu-cron-secret"
```

Deberías ver:
```json
{
  "success": true,
  "message": "Revisadas X tareas, enviadas Y notificaciones",
  "total": X,
  "sent": Y
}
```

#### B. Ver logs del Cron Job

1. En Vercel, ve a **"Deployments"**
2. Haz clic en el deployment actual
3. Ve a **"Functions"**
4. Busca `/api/notifications/check`
5. Verás los logs de cada ejecución cada 5 minutos

#### C. Probar notificaciones en tiempo real

1. Abre tu app: `https://tu-app.vercel.app`
2. Inicia sesión
3. Crea una tarea urgente que venza en 1 hora
4. Espera 5 minutos (próxima ejecución del cron)
5. Deberías ver la notificación en el header

## Configuración del Cron Job

El archivo `vercel.json` configura:

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

### Ajustar frecuencia

Puedes cambiar `"schedule"` según tus necesidades:

- `*/1 * * * *` - Cada minuto (máximo permitido)
- `*/5 * * * *` - Cada 5 minutos (recomendado)
- `*/10 * * * *` - Cada 10 minutos
- `*/15 * * * *` - Cada 15 minutos
- `*/30 * * * *` - Cada 30 minutos
- `0 * * * *` - Cada hora
- `0 */2 * * *` - Cada 2 horas

**Nota**: Vercel tiene límites en el plan gratuito:
- Hobby: 60 ejecuciones/día
- Pro: Ilimitadas

Con `*/5` minutos = 288 ejecuciones/día (necesitas plan Pro)
Con `*/15` minutos = 96 ejecuciones/día (funciona en plan Hobby)

## Monitoreo

### Ver logs en tiempo real

```bash
vercel logs --follow
```

### Ver solo logs del scheduler

```bash
vercel logs --follow | grep "notifications/check"
```

### Buscar errores

```bash
vercel logs | grep -i error
```

## Troubleshooting

### El Cron Job no se ejecuta

1. **Verifica que el proyecto esté en producción**
   - Los Cron Jobs solo funcionan en producción
   - No funcionan en preview deployments

2. **Revisa el plan de Vercel**
   - El plan Hobby tiene límite de 60 ejecuciones/día
   - Ajusta la frecuencia si lo necesitas

3. **Verifica variables de entorno**
   ```bash
   vercel env ls
   ```

### Las notificaciones no llegan a los usuarios

1. **Verifica que haya tareas próximas**
   ```bash
   curl "https://tu-app.vercel.app/api/notifications/debug?secret=tu-cron-secret"
   ```

2. **Verifica que los usuarios estén conectados**
   - Las notificaciones solo llegan a usuarios con sesión activa
   - Abre la app en el navegador

3. **Revisa los logs**
   - Ve a Vercel Dashboard → Functions → `/api/notifications/check`
   - Busca el mensaje: `"sent": X` donde X > 0

### Error: Function timeout

Si el scheduler tarda demasiado:

1. Optimiza la consulta de tareas
2. Aumenta el timeout en `vercel.json`:

```json
{
  "functions": {
    "app/api/notifications/check/route.ts": {
      "maxDuration": 60
    }
  },
  "crons": [...]
}
```

## Desarrollo Local vs Producción

### Desarrollo Local
```bash
# Ejecutar manualmente
./scripts/run-notification-scheduler.sh

# O configurar cron local (Linux/Mac)
crontab -e
# Agregar: */5 * * * * /ruta/al/script/run-notification-scheduler.sh
```

### Producción (Vercel)
- Automático con `vercel.json`
- No necesitas configurar nada adicional
- Los logs están en Vercel Dashboard

## Migración a otro servicio

Si decides cambiar de Vercel a otro servicio:

### Railway, Render, Fly.io
Usa GitHub Actions:

```yaml
# .github/workflows/cron-notifications.yml
name: Notification Scheduler
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger scheduler
        run: |
          curl -X POST https://tu-app.com/api/notifications/check \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### DigitalOcean, AWS, Google Cloud
Usa su servicio de Cron nativo:
- DigitalOcean: Scheduled Jobs
- AWS: EventBridge
- Google Cloud: Cloud Scheduler

## Costos

### Vercel
- **Hobby (Gratis)**: 60 cron ejecuciones/día
- **Pro ($20/mes)**: Ilimitadas

### Alternativas gratuitas
- **cron-job.org**: Gratis, hasta 1 job/minuto
- **EasyCron**: Plan gratis con límites
- **GitHub Actions**: 2000 minutos/mes gratis

## Seguridad

El endpoint está protegido por:

1. **Vercel Cron**: Solo acepta llamadas de `vercel-cron` user-agent
2. **CRON_SECRET**: Token adicional para llamadas manuales
3. **Service Role**: Usa credenciales de servicio Supabase

No expongas públicamente el endpoint sin protección.
