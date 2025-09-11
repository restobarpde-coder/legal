#!/bin/bash

# Script para crear webhook con secret via API de Chatwoot
# Solo usar si no puedes configurar el secret desde la interfaz

# CONFIGURACIÓN (actualizar con tus datos reales)
CHATWOOT_URL="https://app.chatwoot.com"  # O tu URL de Chatwoot
ACCOUNT_ID="1"  # Tu account ID
ACCESS_TOKEN="LBNxwhptF9BukuiRpECzgwBa"  # Tu access token
WEBHOOK_SECRET="7ae696d39521d804e3d1a18b4063c675a83b705ba6206b7604a15364b9c50d41"

# Crear webhook con secret via API
curl -X POST \
  "$CHATWOOT_URL/api/v1/accounts/$ACCOUNT_ID/webhooks" \
  -H "api_access_token: $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"webhook\": {
      \"url\": \"https://app.centrodeasesoramiento.com/api/chatwoot/webhook\",
      \"subscriptions\": [
        \"conversation_created\",
        \"conversation_updated\",
        \"conversation_status_changed\",
        \"message_created\",
        \"message_updated\",
        \"contact_created\",
        \"contact_updated\"
      ]
    },
    \"webhook_secret\": \"$WEBHOOK_SECRET\"
  }"

echo "Webhook creado con secret configurado"
