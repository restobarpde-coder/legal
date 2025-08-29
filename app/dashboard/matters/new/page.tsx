"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { MatterForm } from "@/components/matters/matter-form"
import { createClient } from "@/lib/supabase/client"

export default function NewMatterPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const initializeAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      // Get user profile
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      setProfile(profile)
    }

    initializeAuth()
  }, [router])

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <DashboardLayout user={user} profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance">New Matter</h1>
          <p className="text-muted-foreground">Create a new legal matter</p>
        </div>

        <MatterForm />
      </div>
    </DashboardLayout>
  )
}
