const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSupabase() {
  console.log('🔍 Diagnóstico detallado de Supabase\n');

  try {
    // 1. Verificar autenticación
    console.log('1. Verificando estado de autenticación...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Usuario NO autenticado');
      console.log('   Esto es normal para las consultas de server-side');
      console.log('   El problema puede estar en RLS policies');
    } else {
      console.log('✅ Usuario autenticado:', user.email);
    }
    
    console.log('');

    // 2. Probar consulta simple a clients (sin RLS)
    console.log('2. Probando consulta básica a clients...');
    const { data: clientsBasic, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(5);
    
    if (clientsError) {
      console.log('❌ Error en consulta básica a clients:');
      console.log('   Código:', clientsError.code);
      console.log('   Mensaje:', clientsError.message);
      console.log('   Detalles:', clientsError.details);
      console.log('   Pista:', clientsError.hint);
    } else {
      console.log('✅ Consulta básica exitosa');
      console.log('   Clientes encontrados:', clientsBasic?.length || 0);
      if (clientsBasic && clientsBasic.length > 0) {
        console.log('   Primer cliente:', {
          id: clientsBasic[0].id,
          name: clientsBasic[0].name,
          created_by: clientsBasic[0].created_by
        });
      }
    }
    
    console.log('');

    // 3. Probar consulta con relaciones (como en la app)
    console.log('3. Probando consulta con relaciones (casos)...');
    const { data: clientsWithCases, error: casesError } = await supabase
      .from('clients')
      .select(`
        *,
        cases (
          id,
          title,
          status,
          created_at
        )
      `)
      .limit(3);
    
    if (casesError) {
      console.log('❌ Error en consulta con relaciones:');
      console.log('   Código:', casesError.code);
      console.log('   Mensaje:', casesError.message);
      console.log('   Detalles:', casesError.details);
      console.log('   Pista:', casesError.hint);
    } else {
      console.log('✅ Consulta con relaciones exitosa');
      console.log('   Clientes con casos:', clientsWithCases?.length || 0);
    }
    
    console.log('');

    // 4. Probar consulta a cases
    console.log('4. Probando consulta a cases...');
    const { data: cases, error: casesOnlyError } = await supabase
      .from('cases')
      .select('*')
      .limit(5);
    
    if (casesOnlyError) {
      console.log('❌ Error en consulta a cases:');
      console.log('   Código:', casesOnlyError.code);
      console.log('   Mensaje:', casesOnlyError.message);
      console.log('   Detalles:', casesOnlyError.details);
    } else {
      console.log('✅ Consulta a cases exitosa');
      console.log('   Casos encontrados:', cases?.length || 0);
    }
    
    console.log('');

    // 5. Verificar RLS policies
    console.log('5. Recomendaciones para solucionar problemas:');
    console.log('   - Si las consultas fallan, revisa las políticas RLS');
    console.log('   - Verifica que el usuario esté autenticado en server-side');
    console.log('   - Considera deshabilitar temporalmente RLS para testing');
    console.log('   - Revisa que las relaciones entre tablas estén bien configuradas');
    
  } catch (err) {
    console.error('❌ Error inesperado:', err.message);
    console.error('Stack:', err.stack);
  }
}

debugSupabase();
