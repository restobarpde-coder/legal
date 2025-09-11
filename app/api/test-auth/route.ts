import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🧪 Testing authentication...')
    
    const supabase = await createClient()
    console.log('✅ Supabase client created')
    
    const user = await requireAuth()
    console.log('✅ User authenticated:', { id: user.id, email: user.email })
    
    // Test simple database query
    const { data: testQuery, error: testError } = await supabase
      .from('cases')
      .select('id, title')
      .limit(1)
    
    console.log('✅ Test query result:', { data: testQuery, error: testError })
    
    return NextResponse.json({
      message: 'Auth test successful',
      user: {
        id: user.id,
        email: user.email
      },
      testQuery: testQuery || [],
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Auth test error:', error)
    return NextResponse.json({ 
      error: 'Auth test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
