// Test script para verificar conexión con Chatwoot API
// Ejecutar: node test-chatwoot-api.js

require('dotenv').config({ path: '.env.local' });

const CHATWOOT_BASE_URL = process.env.CHATWOOT_BASE_URL || 'https://app.chatwoot.com';
const CHATWOOT_ACCESS_TOKEN = process.env.CHATWOOT_ACCESS_TOKEN;
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || '1';

console.log('🔍 Verificando configuración...');
console.log('Base URL:', CHATWOOT_BASE_URL);
console.log('Account ID:', CHATWOOT_ACCOUNT_ID);
console.log('Token:', CHATWOOT_ACCESS_TOKEN ? `${CHATWOOT_ACCESS_TOKEN.substring(0, 10)}...` : '❌ NO CONFIGURADO');

async function testChatwootAPI() {
  try {
    console.log('\n📡 Probando conexión con Chatwoot...');
    
    const url = `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations?status=all`;
    console.log('URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'api_access_token': CHATWOOT_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error:', errorText);
      return;
    }

    const data = await response.json();
    console.log('\n✅ Conexión exitosa!');
    console.log('Estructura de respuesta:', Object.keys(data));
    
    const conversations = data.data?.payload || data.payload || [];
    console.log(`\n📊 Conversaciones encontradas: ${conversations.length}`);
    
    if (conversations.length > 0) {
      console.log('\n📝 Primera conversación:');
      const first = conversations[0];
      console.log({
        id: first.id,
        contact: first.contact?.name,
        status: first.status,
        inbox: first.inbox?.name,
        assignee: first.assignee?.name || 'Sin asignar',
        assignee_email: first.assignee?.email || 'N/A'
      });
    }

    // Mostrar estadísticas de asignación
    const withAssignee = conversations.filter(c => c.assignee).length;
    const withoutAssignee = conversations.length - withAssignee;
    
    console.log('\n📈 Estadísticas:');
    console.log(`- Con agente asignado: ${withAssignee}`);
    console.log(`- Sin agente asignado: ${withoutAssignee}`);

    // Listar agentes únicos
    const agents = [...new Set(conversations
      .filter(c => c.assignee)
      .map(c => `${c.assignee.name} (${c.assignee.email})`))];
    
    if (agents.length > 0) {
      console.log('\n👥 Agentes encontrados:');
      agents.forEach(agent => console.log(`  - ${agent}`));
    }

  } catch (error) {
    console.error('\n💥 Error:', error.message);
  }
}

testChatwootAPI();
