// Script para simular un webhook de Chatwoot y crear conversación de prueba
const crypto = require('crypto');

const webhookUrl = 'https://app.centrodeasesoramiento.com/api/chatwoot/webhook';
const secret = '7ae696d39521d804e3d1a18b4063c675a83b705ba6206b7604a15364b9c50d41';

// Datos de prueba - simula una conversación nueva
const testPayload = {
  event: 'conversation_created',
  account: {
    id: 1,
    name: 'Centro de Asesoramiento'
  },
  conversation: {
    id: 12345,
    messages: [],
    contact: {
      id: 1,
      name: 'Cliente Test Fernando',
      email: 'cliente@ejemplo.com',
      phone_number: '+34123456789',
      identifier: 'test-client-fernando'
    },
    inbox: {
      id: 1,
      name: 'Fernando - Email Personal',
      channel_type: 'Channel::Email'
    },
    status: 'open',
    assignee: null,
    team: null,
    meta: {},
    custom_attributes: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
};

// Mensaje de prueba que acompaña
const testMessage = {
  event: 'message_created',
  account: {
    id: 1,
    name: 'Centro de Asesoramiento'
  },
  message: {
    id: 67890,
    content: 'Hola, necesito ayuda con un tema legal urgente. ¿Podrían asesorarme?',
    message_type: 'incoming',
    created_at: new Date().toISOString(),
    conversation_id: 12345,
    sender: {
      id: 1,
      name: 'Cliente de Prueba',
      email: 'cliente@ejemplo.com',
      type: 'contact'
    },
    attachments: [],
    content_attributes: {}
  }
};

function createSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

async function sendTestWebhook(payload, eventName) {
  const payloadString = JSON.stringify(payload);
  const signature = createSignature(payloadString, secret);
  
  console.log(`\n🚀 Enviando webhook: ${eventName}`);
  console.log('📄 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-chatwoot-hmac-sha256': signature
      },
      body: payloadString
    });
    
    const result = await response.text();
    console.log(`✅ Status: ${response.status}`);
    console.log(`📬 Response: ${result}`);
    
  } catch (error) {
    console.error(`❌ Error enviando webhook ${eventName}:`, error.message);
  }
}

async function runTest() {
  console.log('🧪 INICIANDO TEST DE WEBHOOKS DE CHATWOOT');
  console.log('===============================================');
  
  // 1. Crear conversación
  await sendTestWebhook(testPayload, 'conversation_created');
  
  // Esperar un poco
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 2. Crear mensaje
  await sendTestWebhook(testMessage, 'message_created');
  
  console.log('\n🎉 Test completado!');
  console.log('👀 Ve a tu dashboard: https://app.centrodeasesoramiento.com/dashboard/chatwoot');
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  runTest();
}

module.exports = { sendTestWebhook, testPayload, testMessage };
