"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

interface UseAuthReturn {
  user: User | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth session error:', error)
          setError(error.message)
        } else {
          setUser(session?.user ?? null)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        setError(err instanceof Error ? err.message : 'Authentication error')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for changes in auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id)
        
        setUser(session?.user ?? null)
        setLoading(false)
        setError(null)

        if (event === 'SIGNED_OUT') {
          router.refresh()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const signOut = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        setError(error.message)
      }

      // Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }

      // Force redirect
      window.location.href = '/auth/login'
    } catch (err) {
      console.error('Unexpected sign out error:', err)
      setError(err instanceof Error ? err.message : 'Sign out error')
      window.location.href = '/auth/login'
    }
  }

  return {
    user,
    loading,
    error,
    signOut,
  }
}
