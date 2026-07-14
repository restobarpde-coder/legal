#!/bin/bash

# Script para ejecutar manualmente el scheduler de notificaciones
# Útil para desarrollo y testing

# Configurar variables de entorno
source .env.local 2>/dev/null || true

# Token de autorización (debe coincidir con CRON_SECRET en .env.local)
if [ -z "$CRON_SECRET" ]; then
  echo "❌ CRON_SECRET no está definido (en .env.local o el entorno)"
  exit 1
fi

# URL del servidor (ajustar si es necesario)
SERVER_URL="${SERVER_URL:-http://localhost:3000}"

echo "🔔 Ejecutando scheduler de notificaciones..."
echo "📍 Servidor: $SERVER_URL"
echo ""

# Ejecutar el scheduler
response=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$SERVER_URL/api/notifications/check")

# Extraer código de estado
http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

# Mostrar resultado
if [ "$http_code" = "200" ]; then
  echo "✅ Scheduler ejecutado exitosamente"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
  echo "❌ Error ejecutando scheduler (HTTP $http_code)"
  echo "$body"
fi

echo ""
echo "💡 Para ejecutar automáticamente cada 5 minutos, agrega este cron job:"
echo "   0 0 * * * /ruta/al/proyecto/scripts/run-notification-scheduler.sh >> /var/log/notification-scheduler.log 2>&1"
echo "   # Note: For Vercel Hobby accounts, cron jobs are limited to once a day. The schedule '0 0 * * *' runs daily at midnight."
