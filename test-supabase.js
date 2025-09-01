const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key present:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase.from('clients').select('count').limit(1);
    
    if (error) {
      console.error('Supabase error:', error);
      return;
    }
    
    console.log('Connection successful!', data);
    
    // Test full query like in the app
    const { data: clients, error: clientsError } = await supabase
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
      .order('created_at', { ascending: false });
    
    if (clientsError) {
      console.error('Clients query error:', clientsError);
      return;
    }
    
    console.log('Clients query successful:', clients?.length || 0, 'clients found');
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection();
