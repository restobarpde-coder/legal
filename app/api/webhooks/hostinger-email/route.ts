import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { syncEmailAccount } from '@/lib/inbox/imap'

export const runtime = 'nodejs'
export const maxDuration = 60

function secretsForMailbox(mailbox: string): string[] {
  const secrets: string[] = []
  const singleSecret = process.env.HOSTINGER_EMAIL_WEBHOOK_SECRET?.trim()
  if (singleSecret) secrets.push(singleSecret)

  try {
    const mapping = JSON.parse(process.env.HOSTINGER_EMAIL_WEBHOOK_SECRETS ?? '{}') as Record<string, string>
    const mailboxSecret = mapping[mailbox]
    if (typeof mailboxSecret === 'string' && mailboxSecret.trim()) secrets.push(mailboxSecret.trim())
  } catch {
    console.error('[hostinger-email-webhook] HOSTINGER_EMAIL_WEBHOOK_SECRETS is not valid JSON')
  }

  return secrets
}

function secureEqual(left: string, right: string) {
  const leftHash = createHash('sha256').update(left).digest()
  const rightHash = createHash('sha256').update(right).digest()
  return timingSafeEqual(leftHash, rightHash)
}

function eventIdentifier(request: NextRequest, body: Record<string, unknown>) {
  const headerId = request.headers.get('x-webhook-id') ?? request.headers.get('x-event-id')
  const bodyId = body.id ?? body.event_id ?? body.eventId
  if (headerId) return headerId
  if (typeof bodyId === 'string' && bodyId) return bodyId
  return null
}

function eventType(body: Record<string, unknown>) {
  const value = body.event ?? body.type ?? body.event_type
  return typeof value === 'string' ? value : 'message.received'
}

function safePayload(body: Record<string, unknown>, mailbox: string) {
  const eventId = body.id ?? body.event_id ?? body.eventId ?? null
  const type = eventType(body)
  const timestamp = body.timestamp ?? body.created_at ?? body.createdAt ?? null
  return { event_id: eventId, event_type: type, mailbox, timestamp }
}

export async function POST(request: NextRequest) {
  const mailbox = request.nextUrl.searchParams.get('mailbox')?.trim().toLowerCase()
  if (!mailbox) return NextResponse.json({ error: 'Missing mailbox' }, { status: 400 })

  const authorization = request.headers.get('authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const allowedSecrets = secretsForMailbox(mailbox)
  if (!token || allowedSecrets.length === 0 || !allowedSecrets.some(secret => secureEqual(token, secret))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = eventType(body)
  if (type !== 'message.received') {
    return NextResponse.json({ received: true, ignored: true })
  }

  const supabase = createServiceClient()
  const eventId = eventIdentifier(request, body)
  const { data: event, error: eventError } = await supabase
    .from('inbox_webhook_events')
    .insert({
      channel: 'email',
      event_type: type,
      provider_event_id: eventId,
      raw_payload: safePayload(body, mailbox),
      processing_status: 'received',
    })
    .select('id')
    .single()

  if (eventError?.code === '23505') {
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (eventError || !event) {
    console.error('[hostinger-email-webhook] Could not register webhook event')
    return NextResponse.json({ error: 'Could not register event' }, { status: 500 })
  }

  const { data: account, error: accountError } = await supabase
    .from('inbox_email_accounts')
    .select('id')
    .ilike('email_address', mailbox)
    .eq('sync_enabled', true)
    .maybeSingle()

  if (accountError || !account) {
    await supabase.from('inbox_webhook_events').update({
      processing_status: 'ignored',
      error_message: 'Mailbox is not configured or synchronization is disabled',
      processed_at: new Date().toISOString(),
    }).eq('id', event.id)
    return NextResponse.json({ received: true, ignored: true })
  }

  const result = await syncEmailAccount(account.id)
  await supabase.from('inbox_webhook_events').update({
    processing_status: result.error ? 'failed' : 'processed',
    error_message: result.error ?? null,
    processed_at: new Date().toISOString(),
  }).eq('id', event.id)

  if (result.error) return NextResponse.json({ error: 'Mailbox synchronization failed' }, { status: 503 })
  return NextResponse.json({ received: true, created: result.created, busy: result.busy ?? false })
}
