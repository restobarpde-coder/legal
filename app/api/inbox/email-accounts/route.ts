import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/inbox/crypto'
import { requireRole } from '@/lib/authz-server'

export const runtime = 'nodejs'

// ─── GET /api/inbox/email-accounts ───────────────────────────
// Returns accounts visible to the user (via RLS on inbox_email_accounts_safe).
// Credentials (encrypted_password) are never included.

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('inbox_email_accounts_safe')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ accounts: data ?? [] })
}

// ─── POST /api/inbox/email-accounts ──────────────────────────
// Admin only. Creates a new email account with encrypted password.
// Body:
// {
//   account_type:  'personal' | 'shared'
//   user_id?:      string  (required when account_type = 'personal')
//   email_address: string
//   display_name?: string
//   imap_host:     string
//   imap_port?:    number  (default 993)
//   imap_tls?:     boolean (default true)
//   smtp_host:     string
//   smtp_port?:    number  (default 587)
//   smtp_tls?:     boolean (default true)
//   username:      string
//   password:      string  (plain – encrypted here, never stored plain)
// }

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin')
  if (!auth.ok) return auth.response

  const body = await request.json()

  // Validate required fields
  const required = ['account_type', 'email_address', 'imap_host', 'smtp_host', 'username', 'password'] as const
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 })
    }
  }

  if (body.account_type === 'personal' && !body.user_id) {
    return NextResponse.json({ error: 'user_id is required for personal accounts' }, { status: 400 })
  }
  if (body.account_type === 'shared' && body.user_id) {
    return NextResponse.json({ error: 'user_id must be null for shared accounts' }, { status: 400 })
  }

  // Encrypt password before storage — plain text never touches the DB
  let encryptedPassword: string
  try {
    encryptedPassword = encrypt(body.password)
  } catch {
    return NextResponse.json(
      { error: 'Encryption failed – check INBOX_ENCRYPTION_KEY env var' },
      { status: 500 }
    )
  }

  // Use service client to bypass RLS (admin is already verified above)
  const svc = createServiceClient()

  const { data, error } = await svc
    .from('inbox_email_accounts')
    .insert({
      account_type:       body.account_type,
      user_id:            body.user_id  ?? null,
      email_address:      body.email_address,
      display_name:       body.display_name ?? null,
      imap_host:          body.imap_host,
      imap_port:          body.imap_port  ?? 993,
      imap_tls:           body.imap_tls   ?? true,
      smtp_host:          body.smtp_host,
      smtp_port:          body.smtp_port  ?? 587,
      smtp_tls:           body.smtp_tls   ?? true,
      username:           body.username,
      encrypted_password: encryptedPassword,
    })
    .select(`
      id, account_type, user_id, email_address, display_name,
      imap_host, imap_port, imap_tls,
      smtp_host, smtp_port, smtp_tls,
      username, sync_enabled, last_sync_at, created_at
    `)
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'An account with that email address already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ account: data }, { status: 201 })
}
