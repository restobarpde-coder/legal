const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Configurada' : '❌ Faltante')
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Configurada' : '❌ Faltante')
  process.exit(1)
}

console.log('🔍 Verificando conexión a Supabase...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    // Test connection by checking if we can list tables
    const { data, error } = await supabase
      .from('cases')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Error conectando a la base de datos:', error.message)
      return false
    }

    console.log('✅ Conexión exitosa a Supabase!')
    console.log('📊 Número de casos en la tabla:', data?.length || 0)
    return true

  } catch (err) {
    console.error('❌ Error de conexión:', err.message)
    return false
  }
}

testConnection()
  .then(success => {
    if (success) {
      console.log('🎉 ¡Base de datos configurada correctamente!')
    } else {
      console.log('🔧 Revisa la configuración de Supabase')
      process.exit(1)
    }
  })
  .catch(err => {
    console.error('💥 Error inesperado:', err)
    process.exit(1)
  })
