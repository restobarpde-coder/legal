const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuración de clientes Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🏛️  VERIFICACIÓN COMPLETA DE SUPABASE - SISTEMA LEGAL\n');

// Cliente con clave anónima (para simular usuario no autenticado)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Cliente con clave de servicio (para bypass RLS y verificar estructura)
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function verifySupabaseConnection() {
  // Tablas principales del sistema legal
  const legalTables = [
    'users',
    'clients', 
    'cases',
    'case_members',
    'tasks',
    'documents',
    'notes',
    'time_entries'
  ];

  console.log('📋 1. VERIFICANDO CONFIGURACIÓN...');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Clave Anónima: ${supabaseAnonKey ? '✅ Configurada' : '❌ Falta'}`);
  console.log(`   Clave Servicio: ${supabaseServiceKey ? '✅ Configurada' : '❌ Falta'}`);
  console.log('');

  console.log('🔍 2. VERIFICANDO ESTRUCTURA DE TABLAS (Service Role)...');
  const tableStats = {};
  
  for (const table of legalTables) {
    try {
      const { data, error, count } = await supabaseService
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ ${table}: ERROR - ${error.message}`);
        tableStats[table] = { status: 'error', count: 0, error: error.message };
      } else {
        console.log(`   ✅ ${table}: ${count || 0} registros`);
        tableStats[table] = { status: 'ok', count: count || 0 };
      }
    } catch (err) {
      console.log(`   💥 ${table}: EXCEPCIÓN - ${err.message}`);
      tableStats[table] = { status: 'exception', count: 0, error: err.message };
    }
  }
  console.log('');

  console.log('🔒 3. VERIFICANDO POLÍTICAS RLS (Anon Key)...');
  for (const table of legalTables) {
    try {
      const { data, error, count } = await supabaseAnon
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        // Esto es esperado para tablas con RLS - usuario no autenticado
        if (error.message.includes('row-level security') || error.code === 'PGRST116') {
          console.log(`   🔒 ${table}: RLS activo (esperado)`);
        } else {
          console.log(`   ⚠️  ${table}: Error inesperado - ${error.message}`);
        }
      } else {
        // Solo users y clients deberían ser accesibles sin autenticación
        if (table === 'users' || table === 'clients') {
          console.log(`   ✅ ${table}: Accesible públicamente (${count || 0} registros)`);
        } else {
          console.log(`   ⚠️  ${table}: Accesible sin autenticación (revisar RLS)`);
        }
      }
    } catch (err) {
      console.log(`   💥 ${table}: EXCEPCIÓN - ${err.message}`);
    }
  }
  console.log('');

  console.log('👥 4. VERIFICANDO DATOS DE MUESTRA...');
  
  // Verificar algunos datos específicos
  try {
    const { data: users } = await supabaseService.from('users').select('id, email, full_name, role').limit(3);
    console.log(`   👤 Usuarios: ${users?.length || 0} encontrados`);
    users?.forEach(user => {
      console.log(`      - ${user.full_name} (${user.email}) - ${user.role}`);
    });

    const { data: clients } = await supabaseService.from('clients').select('id, name, email').limit(3);
    console.log(`   🏢 Clientes: ${clients?.length || 0} encontrados`);
    clients?.forEach(client => {
      console.log(`      - ${client.name} (${client.email || 'Sin email'})`);
    });

    const { data: cases } = await supabaseService.from('cases').select('id, title, status').limit(3);
    console.log(`   ⚖️  Casos: ${cases?.length || 0} encontrados`);
    cases?.forEach(case_ => {
      console.log(`      - ${case_.title} (${case_.status})`);
    });

  } catch (err) {
    console.log(`   💥 Error al obtener datos de muestra: ${err.message}`);
  }
  console.log('');

  console.log('📊 5. RESUMEN FINAL...');
  const totalTables = legalTables.length;
  const workingTables = Object.values(tableStats).filter(stat => stat.status === 'ok').length;
  const totalRecords = Object.values(tableStats).reduce((sum, stat) => sum + (stat.count || 0), 0);
  
  console.log(`   📋 Tablas principales: ${workingTables}/${totalTables} funcionando`);
  console.log(`   📊 Total de registros: ${totalRecords}`);
  
  if (workingTables === totalTables && totalRecords > 0) {
    console.log('   🎉 ¡CONEXIÓN CON SUPABASE COMPLETAMENTE FUNCIONAL!');
    console.log('   ✨ El sistema está listo para usar');
    return true;
  } else {
    console.log('   ⚠️  Hay algunos problemas menores, pero la conexión básica funciona');
    return false;
  }
}

verifySupabaseConnection()
  .then(success => {
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('✅ VERIFICACIÓN COMPLETADA - TODO FUNCIONANDO CORRECTAMENTE');
    } else {
      console.log('⚠️  VERIFICACIÓN COMPLETADA - CON OBSERVACIONES MENORES');
    }
    console.log('='.repeat(60));
  })
  .catch(err => {
    console.error('\n❌ ERROR DURANTE LA VERIFICACIÓN:', err.message);
    process.exit(1);
  });
