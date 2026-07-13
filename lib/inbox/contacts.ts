type InboxContactInput = {
  name?: string | null
  email?: string | null
  phone?: string | null
  linkedClientId?: string | null
}

/**
 * Keeps a durable contact record for inquiries that may not yet be clients.
 * The caller uses a service-role Supabase client because inbound integrations
 * run without an authenticated staff session.
 */
export async function resolveInboxContact(supabase: any, input: InboxContactInput): Promise<string | null> {
  const email = input.email?.trim().toLowerCase() || null
  const phone = input.phone?.trim() || null
  if (!email && !phone) return null

  let existing: { id: string } | null = null
  if (email) {
    const { data } = await supabase.from('inbox_contacts').select('id').ilike('email', email).maybeSingle()
    existing = data
  }
  if (!existing && phone) {
    const { data } = await supabase.from('inbox_contacts').select('id').eq('phone', phone).maybeSingle()
    existing = data
  }

  if (existing) {
    // Partial callers (e.g. a webhook that only knows the phone) must not
    // wipe fields another flow already filled in.
    const updates: Record<string, unknown> = {}
    if (input.name) updates.name = input.name
    if (email) updates.email = email
    if (phone) updates.phone = phone
    if (input.linkedClientId) {
      updates.linked_client_id = input.linkedClientId
      updates.kind = 'client'
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from('inbox_contacts').update(updates).eq('id', existing.id)
    }
    return existing.id
  }

  const { data, error } = await supabase.from('inbox_contacts').insert({
    name: input.name ?? null,
    email,
    phone,
    linked_client_id: input.linkedClientId ?? null,
    kind: input.linkedClientId ? 'client' : 'prospect',
  }).select('id').single()
  if (error) throw new Error(`Could not create inbox contact: ${error.message}`)
  return data.id
}
