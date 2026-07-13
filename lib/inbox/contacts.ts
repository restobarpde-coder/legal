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

  const updates = {
    name: input.name ?? null,
    email,
    phone,
    linked_client_id: input.linkedClientId ?? null,
    kind: input.linkedClientId ? 'client' : 'prospect',
  }

  if (existing) {
    await supabase.from('inbox_contacts').update(updates).eq('id', existing.id)
    return existing.id
  }

  const { data, error } = await supabase.from('inbox_contacts').insert(updates).select('id').single()
  if (error) throw new Error(`Could not create inbox contact: ${error.message}`)
  return data.id
}
