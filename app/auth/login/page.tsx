"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Scale } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Handle authentication tokens from URL (e.g., email confirmation)
  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient()
      
      // Check if there's a session (user is already authenticated)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        router.push('/dashboard')
        return
      }
      
      // Handle auth callback from URL hash
      const { data, error } = await supabase.auth.getUser()
      
      if (data?.user) {
        router.push('/dashboard')
      } else if (error) {
        console.error('Auth error:', error)
        setError(error.message)
      }
    }

    handleAuthCallback()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 Attempting login with:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('❌ Login error:', error)
        throw error
      }
      
      console.log('✅ Login successful, user:', data.user)
      
      // Redirect to dashboard
      window.location.href = '/dashboard'
      
    } catch (error: unknown) {
      console.error('❌ Login failed:', error)
      setError(error instanceof Error ? error.message : "An error occurred")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">LegalStudio</h1>
          </div>
          <p className="text-muted-foreground text-center">Professional legal practice management</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your legal practice dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="lawyer@lawfirm.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && (
                  <div className={`p-3 text-sm rounded-md ${
                    error.includes('successful') 
                      ? 'text-green-700 bg-green-50 border border-green-200' 
                      : 'text-destructive bg-destructive/10 border border-destructive/20'
                  }`}>
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/auth/sign-up" className="underline underline-offset-4 text-primary hover:text-primary/80">
                  Create account
                </Link>
              </div>
              
              {/* Show navigation links after successful login */}
              {error && error.includes('successful') && (
                <div className="mt-4 space-y-2">
                  <Link href="/dashboard/simple">
                    <Button variant="outline" className="w-full">
                      Go to Simple Dashboard
                    </Button>
                  </Link>
                  <Link href="/auth/test">
                    <Button variant="ghost" className="w-full">
                      Check Auth Status
                    </Button>
                  </Link>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
