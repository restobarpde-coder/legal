import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

export async function requireAuth() {
  const user = await getUser()

  if (!user) {
    redirect("/login")
  }

  return user
}

/**
 * Version of requireAuth for API routes
 * Returns null instead of redirecting, since redirect() doesn't work in API routes
 */
export async function requireAuthAPI() {
  const user = await getUser()
  return user
}

export async function getUserProfile() {
  const supabase = await createClient()
  const user = await requireAuth()

  const { data: profile, error } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (error) {
    console.error("Error fetching user profile:", error)

    // If user profile doesn't exist, try to create it from auth user data
    if (error.code === 'PGRST116') { // Row not found
      console.log('User profile not found, attempting to create from auth data...')

      const { data: newProfile, error: createError } = await supabase.from("users").insert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
        role: user.user_metadata?.role || 'assistant',
        phone: user.user_metadata?.phone || null
      }).select().single()

      if (createError) {
        console.error("Error creating user profile:", createError)
        return null
      }

      console.log('User profile created successfully:', newProfile)
      return newProfile
    }

    return null
  }

  return profile
}
