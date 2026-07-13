import { ImapFlow } from 'imapflow'
import { simpleParser, type AddressObject } from 'mailparser'
import { createServiceClient } from '@/lib/supabase/server'
import { decrypt } from './crypto'
import { resolveInboxContact } from './contacts'
import { storeInboxAttachment } from './attachments'
import { notifyInboxMessage } from './notifications'

// ─── Types ────────────────────────────────────────────────────

interface EmailAccount {
  id:                string
  user_id:           string | null
  account_type:      'personal' | 'shared'
  email_address:     string
  display_name:      string | null
  imap_host:         string
  imap_port:         number
  imap_tls:          boolean
  username:          string
  encrypted_password: string
  last_uid:          number
}

export interface SyncResult {
  account_id:   string
  fetched:      number
  created:      number
  error?:       string
}

// ─── Main entry point ─────────────────────────────────────────

/**
 * Syncs INBOX for one email account.
 * Uses the service-role client so RLS never blocks internal ops.
 * Passwords are decrypted server-side and never appear in logs.
 */
export async function syncEmailAccount(accountId: string): Promise<SyncResult> {
  const supabase = createServiceClient()

  const { data: account, error: fetchErr } = await supabase
    .from('inbox_email_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('sync_enabled', true)
    .single()

  if (fetchErr || !account) {
    return { account_id: accountId, fetched: 0, created: 0, error: 'Account not found or sync disabled' }
  }

  // Record this sync run
  const { data: runRow } = await supabase
    .from('inbox_sync_runs')
    .insert({ email_account_id: accountId, status: 'running' })
    .select('id')
    .single()
  const runId = runRow?.id ?? null

  let fetched = 0
  let created = 0
  let errorMessage: string | undefined

  try {
    const password = decrypt(account.encrypted_password)

    const client = new ImapFlow({
      host:   account.imap_host,
      port:   account.imap_port,
      secure: account.imap_tls,
      auth:   { user: account.username, pass: password },
      logger: false, // never log IMAP session (would expose credentials)
    })

    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      const lastUid: number = account.last_uid ?? 0
      let maxUid = lastUid

      // On first sync limit to last 30 days to avoid flooding
      let uidList: number[] = []
      if (lastUid === 0) {
        const since = new Date()
        since.setDate(since.getDate() - 30)
        uidList = (await client.search({ since }, { uid: true })) as number[]
      } else {
        uidList = (await client.search({ uid: `${lastUid + 1}:*` }, { uid: true })) as number[]
      }

      if (uidList.length === 0) {
        lock.release()
        await client.logout()
        await supabase
          .from('inbox_email_accounts')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', accountId)
        await finishRun(supabase, runId, 'completed', 0, 0)
        return { account_id: accountId, fetched: 0, created: 0 }
      }

      const uidSet = uidList.join(',')

      for await (const msg of client.fetch(uidSet, { uid: true, source: true }, { uid: true })) {
        fetched++
        if (msg.uid > maxUid) maxUid = msg.uid

        const parsed = await simpleParser(msg.source as Buffer)

        const messageId  = parsed.messageId   ?? null
        const inReplyTo  = parsed.inReplyTo   ?? null
        const subject    = parsed.subject      ?? null
        const text       = parsed.text         ?? null
        const sentAt     = parsed.date         ?? new Date()
        const fromAddr   = firstAddress(parsed.from)
        const fromName   = fromAddr?.name ?? fromAddr?.address ?? null
        const fromEmail  = fromAddr?.address ?? null
        const toAddrs    = addressList(parsed.to)
        const ccAddrs    = addressList(parsed.cc)

        // Skip if already stored (idempotency)
        if (messageId) {
          const { data: dup } = await supabase
            .from('inbox_messages')
            .select('id')
            .eq('email_account_id', accountId)
            .eq('email_message_id', messageId)
            .maybeSingle()
          if (dup) continue
        }

        // Find or create conversation via thread matching
        const conversationId = await resolveConversation(supabase, account, {
          messageId,
          inReplyTo,
          subject,
          fromName,
          fromEmail,
          sentAt,
        })

        // Persist message
        const { data: storedMessage, error: insertError } = await supabase.from('inbox_messages').insert({
          conversation_id:  conversationId,
          direction:        'inbound',
          content:          text,
          content_type:     'text',
          sender_type:      'contact',
          sender_name:      fromName ?? fromEmail,
          email_account_id: accountId,
          email_message_id: messageId,
          email_from:       parsed.from?.text ?? null,
          email_to:         toAddrs,
          email_cc:         ccAddrs,
          sent_at:          sentAt.toISOString(),
          attachments:      parsed.attachments.map(a => ({
            filename:    a.filename ?? null,
            contentType: a.contentType,
            size:        a.size ?? null,
          })),
        }).select('id').single()
        if (insertError || !storedMessage) throw new Error('Could not persist incoming email message')

        const savedAttachments = []
        for (const attachment of parsed.attachments) {
          try {
            savedAttachments.push(await storeInboxAttachment(storedMessage.id, {
              filename: attachment.filename ?? 'archivo-adjunto',
              mimeType: attachment.contentType || 'application/octet-stream',
              content: attachment.content,
              source: 'email',
            }))
          } catch {
            console.error(`[inbox/imap] Could not archive attachment for account ${accountId}`)
          }
        }
        if (savedAttachments.length > 0) {
          await supabase.from('inbox_messages').update({
            attachments: savedAttachments.map(attachment => ({
              attachmentId: attachment.id,
              filename: attachment.original_filename,
              mimeType: attachment.mime_type,
              size: attachment.size_bytes,
            })),
          }).eq('id', storedMessage.id)
        }

        // Update conversation summary (non-atomic: race unlikely in single sync)
        const { data: conv } = await supabase
          .from('inbox_conversations')
          .select('unread_count')
          .eq('id', conversationId)
          .single()

        await supabase.from('inbox_conversations').update({
          last_message_at:      sentAt.toISOString(),
          last_message_preview: text?.slice(0, 200) ?? '',
          unread_count:         (conv?.unread_count ?? 0) + 1,
        }).eq('id', conversationId)

        try {
          await notifyInboxMessage(supabase, {
            conversationId,
            messageId: storedMessage.id,
            channel: 'email',
            preview: text?.slice(0, 200) ?? '',
          })
        } catch (notificationError) {
          console.error('[inbox/imap] Could not create inbox notification', notificationError)
        }

        created++
      }

      // Advance the UID watermark
      if (maxUid > lastUid) {
        await supabase
          .from('inbox_email_accounts')
          .update({ last_uid: maxUid, last_sync_at: new Date().toISOString() })
          .eq('id', accountId)
      }

    } finally {
      lock.release()
    }

    await client.logout()

  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err)
    // Do NOT log err directly — IMAP errors can contain auth details in some libs
    console.error(`[inbox/imap] Sync failed for account ${accountId}`)
  }

  await finishRun(
    supabase,
    runId,
    errorMessage ? 'failed' : 'completed',
    fetched,
    created,
    errorMessage
  )

  return { account_id: accountId, fetched, created, error: errorMessage }
}

// ─── Thread resolution ─────────────────────────────────────────

async function resolveConversation(
  supabase: ReturnType<typeof createServiceClient>,
  account: EmailAccount,
  opts: {
    messageId:  string | null
    inReplyTo:  string | null
    subject:    string | null
    fromName:   string | null
    fromEmail:  string | null
    sentAt:     Date
  }
): Promise<string> {
  const { messageId, inReplyTo, subject, fromName, fromEmail, sentAt } = opts

  // 1. Try to find the conversation this is a reply to
  if (inReplyTo) {
    // Look for a previous message whose email_message_id matches
    const { data: parentMsg } = await supabase
      .from('inbox_messages')
      .select('conversation_id')
      .eq('email_account_id', account.id)
      .eq('email_message_id', inReplyTo)
      .maybeSingle()

    if (parentMsg) return parentMsg.conversation_id

    // Also check if a conversation was rooted at that ID
    const { data: threadConv } = await supabase
      .from('inbox_conversations')
      .select('id')
      .eq('email_account_id', account.id)
      .eq('email_thread_id', inReplyTo)
      .maybeSingle()

    if (threadConv) return threadConv.id
  }

  // 2. No existing thread → create a new conversation
  return createConversation(supabase, account, { messageId, subject, fromName, fromEmail, sentAt })
}

async function createConversation(
  supabase: ReturnType<typeof createServiceClient>,
  account: EmailAccount,
  opts: {
    messageId:  string | null
    subject:    string | null
    fromName:   string | null
    fromEmail:  string | null
    sentAt:     Date
  }
): Promise<string> {
  const { messageId, subject, fromName, fromEmail } = opts

  // Auto-link to existing client by email
  let linkedClientId: string | null = null
  if (fromEmail) {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('email', fromEmail)
      .maybeSingle()
    linkedClientId = client?.id ?? null
  }

  const inboxContactId = await resolveInboxContact(supabase, {
    name: fromName,
    email: fromEmail,
    linkedClientId,
  })

  const { data: conv, error } = await supabase
    .from('inbox_conversations')
    .insert({
      channel:          'email',
      inbox_type:       account.account_type === 'personal' ? 'email_personal' : 'email_shared',
      email_account_id: account.id,
      contact_name:     fromName ?? fromEmail ?? 'Sin nombre',
      contact_email:    fromEmail,
      assigned_user_id: account.account_type === 'personal' ? account.user_id : null,
      inbox_contact_id: inboxContactId,
      linked_client_id: linkedClientId,
      email_thread_id:  messageId,
      email_subject:    subject,
      status:           'open',
    })
    .select('id')
    .single()

  if (error || !conv) throw new Error(`Failed to create conversation: ${error?.message}`)
  return conv.id
}

// ─── Helpers ──────────────────────────────────────────────────

function firstAddress(ao: AddressObject | AddressObject[] | undefined | null) {
  if (!ao) return null
  const obj = Array.isArray(ao) ? ao[0] : ao
  return obj?.value?.[0] ?? null
}

function addressList(ao: AddressObject | AddressObject[] | undefined | null): string[] {
  if (!ao) return []
  const objs = Array.isArray(ao) ? ao : [ao]
  return objs.flatMap(o => o.value?.map(a => a.address).filter(Boolean) ?? []) as string[]
}

async function finishRun(
  supabase: ReturnType<typeof createServiceClient>,
  runId:    string | null,
  status:   'completed' | 'failed',
  fetched:  number,
  created:  number,
  errorMessage?: string
) {
  if (!runId) return
  await supabase.from('inbox_sync_runs').update({
    status,
    messages_fetched: fetched,
    messages_new:     created,
    error_message:    errorMessage ?? null,
    finished_at:      new Date().toISOString(),
  }).eq('id', runId)
}
