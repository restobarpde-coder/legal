import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { syncEmailAccount } from '@/lib/inbox/imap'
import { requireRole } from '@/lib/authz-server'

export const runtime    = 'nodejs'
export const maxDuration = 60  // seconds; raise in Vercel settings for large mailboxes

// ─── POST /api/email/sync ─────────────────────────────────────
// Admin-only. Syncs one or all enabled email accounts.
// Body (optional): { account_id: string }
// Without body: syncs ALL enabled accounts sequentially.

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin')
  if (!auth.ok) return auth.response

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
// Returns recent email webhook processing history. Admin only.

export async function GET() {
  const auth = await requireRole('admin')
  if (!auth.ok) return auth.response
  const supabase = await createClient()

  const { data: events, error } = await supabase
    .from('inbox_webhook_events')
    .select(`
      id, event_type, provider_event_id, raw_payload, processing_status,
      error_message, processed_at, created_at
    `)
    .eq('channel', 'email')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events })
}
