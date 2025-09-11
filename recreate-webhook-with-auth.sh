#!/bin/bash

# Script para recrear webhook con autenticación API en Chatwoot

CHATWOOT_URL="https://app.chatwoot.com"
ACCOUNT_ID="1"
ACCESS_TOKEN="LBNxwhptF9BukuiRpECzgwBa"

echo "🔑 Intentando crear webhook con autenticación API..."

# 1. Listar webhooks existentes
echo "📋 Webhooks existentes:"
curl -s -X GET \
  "$CHATWOOT_URL/api/v1/accounts/$ACCOUNT_ID/webhooks" \
  -H "api_access_token: $ACCESS_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "🔧 Creando nuevo webhook con configuración completa..."

# 2. Crear webhook con todas las configuraciones posibles
WEBHOOK_RESPONSE=$(curl -s -X POST \
  "$CHATWOOT_URL/api/v1/accounts/$ACCOUNT_ID/webhooks" \
  -H "api_access_token: $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://app.centrodeasesoramiento.com/api/chatwoot/webhook",
    "subscriptions": [
      "conversation_created",
      "conversation_updated", 
      "conversation_status_changed",
      "message_created",
      "message_updated",
      "contact_created",
      "contact_updated",
      "webwidget_triggered"
    ]
  }')

echo "📋 Respuesta de creación:"
echo "$WEBHOOK_RESPONSE" | jq '.'

echo ""
echo "✅ Si funcionó, deberías ver el webhook en tu panel de Chatwoot"
echo "🧪 Prueba enviando un email nuevo o creando una conversación"
