const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wijlqlbubzljtraipipr.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpamxxbGJ1YnpsanRyYWlwaXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDc1NzMsImV4cCI6MjA3MjA4MzU3M30.dnLpNAuT5AO_iUUvYDGwem9PKP9zO4lMiDgx4vxDbI8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugDatabase() {
  console.log('🔍 Debugging database structure...')
  
  try {
    // Test 1: Check if users table exists
    console.log('\n1. Testing users table...')
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    console.log('Users query result:', { usersData, usersError })

    // Test 2: Check if clients table exists
    console.log('\n2. Testing clients table...')
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(5)
    console.log('Clients query result:', { clientsData, clientsError })

    // Test 3: Check current user
    console.log('\n3. Testing current user...')
    const { data: userData, error: userError } = await supabase.auth.getUser()
    console.log('Current user:', { userData, userError })

    // Test 4: Check table structure
    console.log('\n4. Getting table information...')
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('get_table_info')
      .catch(() => ({ data: null, error: 'RPC function not available' }))
    console.log('Tables info:', { tablesData, tablesError })

  } catch (error) {
    console.error('Debug script error:', error)
  }
}

debugDatabase()
