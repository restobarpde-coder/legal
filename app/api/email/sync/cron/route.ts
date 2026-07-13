import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { syncEmailAccount } from '@/lib/inbox/imap'

export const runtime = 'nodejs'
export const maxDuration = 60

// Called by Vercel Cron. CRON_SECRET must be configured in production.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: accounts, error } = await supabase
    .from('inbox_email_accounts')
    .select('id')
    .eq('sync_enabled', true)

  if (error) return NextResponse.json({ error: 'Failed to list email accounts' }, { status: 500 })

  const results = []
  for (const account of accounts ?? []) {
    results.push(await syncEmailAccount(account.id))
  }

  return NextResponse.json({
    success: results.every(result => !result.error),
    accounts_synced: results.length,
    results,
  })
}
