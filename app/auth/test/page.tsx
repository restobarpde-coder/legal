"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

export default function AuthTestPage() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('Session:', session)
      console.log('User:', user)
      
      setSession(session)
      setUser(user)
      setLoading(false)
    }
    
    getSession()
  }, [])

  if (loading) {
    return <div className="p-8">Loading auth test...</div>
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auth Test Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Session Status:</h2>
          <p>{session ? '✅ Session exists' : '❌ No session'}</p>
          {session && (
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          )}
        </div>
        
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">User Status:</h2>
          <p>{user ? '✅ User authenticated' : '❌ No user'}</p>
          {user && (
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          )}
        </div>
        
        <div className="p-4 border rounded">
          <a href="/auth/login" className="text-blue-500 underline mr-4">Back to Login</a>
          <a href="/dashboard" className="text-blue-500 underline">Go to Dashboard</a>
        </div>
      </div>
    </div>
  )
}
