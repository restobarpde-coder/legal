import { createBrowserClient } from "@supabase/ssr"

function makeClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

let client: ReturnType<typeof makeClient> | null = null

export function createClient() {
  if (client) return client
  const instance = makeClient()
  client = instance

  // supabase-js 2.56 never forwards the session JWT to the Realtime socket on
  // SIGNED_IN/TOKEN_REFRESHED, so channels join as `anon` and RLS silently
  // drops every postgres_changes event. Keep the socket authenticated for the
  // whole session lifetime; subscribers that need a deterministic order can
  // additionally await realtime.setAuth() before subscribing.
  void instance.realtime.setAuth()
  instance.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
      void instance.realtime.setAuth()
    }
  })

  return instance
}
