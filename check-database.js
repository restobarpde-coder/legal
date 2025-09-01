const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno desde .env.local
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Archivo .env.local no encontrado');
    process.exit(1);
  }
  
  const envFile = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
  
  return envVars;
}

const env = loadEnvFile();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Verificando configuración de Supabase...\n');
console.log('URL:', supabaseUrl);
console.log('Key presente:', !!supabaseKey);
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    console.log('📊 Verificando conexión a Supabase...');
    
    // Lista de tablas que deberían existir
    const expectedTables = ['users', 'clients', 'cases', 'case_members', 'tasks', 'documents', 'notes', 'time_entries'];
    
    console.log('\n🔍 Verificando tablas existentes...');
    
    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ Tabla '${tableName}': NO EXISTE`);
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`✅ Tabla '${tableName}': EXISTE`);
        }
      } catch (err) {
        console.log(`❌ Tabla '${tableName}': ERROR - ${err.message}`);
      }
    }
    
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard');
    console.log('2. Selecciona tu proyecto');
    console.log('3. Ve a "SQL Editor"');
    console.log('4. Ejecuta los scripts en este orden:');
    console.log('   - scripts/01-types.sql');
    console.log('   - scripts/02-tables.sql');
    console.log('   - scripts/03-functions.sql');
    console.log('   - scripts/04-rls-policies.sql');
    console.log('   - scripts/05-storage.sql');
    console.log('   - scripts/06-seed-data.sql (opcional - datos de prueba)');
    console.log('\n📝 Después de ejecutar los scripts, ejecuta este comando nuevamente para verificar.');
    
  } catch (err) {
    console.error('❌ Error inesperado:', err.message);
  }
}

checkDatabase();
