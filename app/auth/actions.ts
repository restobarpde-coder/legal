'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(email: string, password: string) {
  const supabase = await createClient()

  try {
    console.log('🔄 Server login attempt for:', email)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('❌ Server login error:', error)
      return { error: error.message }
    }

    console.log('✅ Server login successful!')
    
    // Verify session was created
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('❌ Session verification failed:', sessionError)
      return { error: 'Session creation failed' }
    }
    
    console.log('✅ Session verified, redirecting...')
    
  } catch (error) {
    console.error('❌ Unexpected login error:', error)
    return { error: 'An unexpected error occurred' }
  }

  // Redirect on success
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Logout error:', error)
    }
  } catch (error) {
    console.error('Unexpected logout error:', error)
  }
  
  redirect('/auth/login')
}
