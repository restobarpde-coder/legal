#!/bin/bash

# Script para crear una conversación real en Chatwoot que debería disparar el webhook

# CONFIGURACIÓN - Actualiza estos valores
CHATWOOT_URL="https://app.chatwoot.com"  # Tu URL de Chatwoot
ACCOUNT_ID="1"  # Tu account ID  
ACCESS_TOKEN="LBNxwhptF9BukuiRpECzgwBa"  # Tu access token
INBOX_ID="1"  # ID del inbox donde crear la conversación

echo "🚀 Creando conversación real en Chatwoot..."

# 1. Crear contacto
CONTACT_RESPONSE=$(curl -s -X POST \
  "$CHATWOOT_URL/api/v1/accounts/$ACCOUNT_ID/contacts" \
  -H "api_access_token: $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cliente Real API Test",
    "email": "clientereal@ejemplo.com",
    "phone_number": "+34600123456"
  }')

CONTACT_ID=$(echo $CONTACT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✅ Contacto creado con ID: $CONTACT_ID"

# 2. Crear conversación
CONVERSATION_RESPONSE=$(curl -s -X POST \
  "$CHATWOOT_URL/api/v1/accounts/$ACCOUNT_ID/conversations" \
  -H "api_access_token: $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"source_id\": \"$CONTACT_ID\",
    \"inbox_id\": $INBOX_ID,
    \"message\": {
      \"content\": \"Hola, esta es una consulta legal real creada via API. ¿Podrían ayudarme?\",
      \"message_type\": \"incoming\"
    }
  }")

CONVERSATION_ID=$(echo $CONVERSATION_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✅ Conversación creada con ID: $CONVERSATION_ID"
echo "📋 Response: $CONVERSATION_RESPONSE"

echo ""
echo "🎯 Si el webhook funciona, deberías ver esta conversación en:"
echo "   https://app.centrodeasesoramiento.com/dashboard/chatwoot"
echo ""
echo "👀 También revisa los logs de tu aplicación para ver si llegó el webhook."
