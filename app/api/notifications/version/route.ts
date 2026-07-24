import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error, count } = await supabase
    .from('notifications')
    .select('id, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .is('read_at', null)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    version: JSON.stringify({
      count: count ?? 0,
      latest: data?.[0] ?? null,
    }),
  })
}
