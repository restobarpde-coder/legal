import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { syncEmailAccount } from '@/lib/inbox/imap'

export const runtime    = 'nodejs'
export const maxDuration = 60  // seconds; raise in Vercel settings for large mailboxes

// ─── POST /api/email/sync ─────────────────────────────────────
// Admin-only. Syncs one or all enabled email accounts.
// Body (optional): { account_id: string }
// Without body: syncs ALL enabled accounts sequentially.

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Parse optional body
  let targetAccountId: string | null = null
  try {
    const body = await request.json()
    targetAccountId = body?.account_id ?? null
  } catch {
    // No body is fine
  }

  const serviceClient = createServiceClient()

  // Determine which accounts to sync
  let accountIds: string[]
  if (targetAccountId) {
    accountIds = [targetAccountId]
  } else {
    const { data: accounts, error: listErr } = await serviceClient
      .from('inbox_email_accounts')
      .select('id')
      .eq('sync_enabled', true)

    if (listErr) {
      return NextResponse.json({ error: 'Failed to list accounts' }, { status: 500 })
    }
    accountIds = (accounts ?? []).map(a => a.id)
  }

  if (accountIds.length === 0) {
    return NextResponse.json({ message: 'No accounts to sync', results: [] })
  }

  // Run syncs sequentially to avoid IMAP connection storms
  const results = []
  for (const id of accountIds) {
    const result = await syncEmailAccount(id)
    results.push(result)
  }

  const hasErrors = results.some(r => r.error)

  return NextResponse.json({
    success:       !hasErrors,
    accounts_synced: results.length,
    results,
  }, { status: hasErrors ? 207 : 200 })
}

// ─── GET /api/email/sync ──────────────────────────────────────
// Returns recent sync run history. Admin only.

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { data: runs, error } = await supabase
    .from('inbox_sync_runs')
    .select(`
      id, status, messages_fetched, messages_new, error_message,
      started_at, finished_at,
      inbox_email_accounts ( email_address, account_type )
    `)
    .order('started_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ runs })
}
