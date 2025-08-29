import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js"

let supabaseClient: SupabaseClient | null = null

export function createClient() {
  // Return existing client instance if it exists
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Create new client instance and cache it
  supabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Persist session in localStorage
      persistSession: true,
      // Auto refresh session
      autoRefreshToken: true,
      // Detect session in URL
      detectSessionInUrl: true
    }
  })

  return supabaseClient
}
