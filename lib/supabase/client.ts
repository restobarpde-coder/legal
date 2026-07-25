import { createBrowserClient } from "@supabase/ssr"

function makeClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

let client: ReturnType<typeof makeClient> | null = null

export function createClient() {
  if (client) return client
  const instance = makeClient()
  client = instance

  // A Realtime socket that joins as `anon` makes RLS drop every
  // postgres_changes event without surfacing an error, and supabase-js has
  // shipped versions that did not forward the session JWT on their own (2.56,
  // which this project used to float onto through a "latest" range). The
  // dependency is pinned now and recent versions handle it, but re-asserting
  // the token is cheap and keeps the socket authenticated for the whole
  // session; subscribers that need a deterministic order can additionally
  // await realtime.setAuth() before subscribing.
  void instance.realtime.setAuth()
  instance.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
      void instance.realtime.setAuth()
    }
  })

  return instance
}
