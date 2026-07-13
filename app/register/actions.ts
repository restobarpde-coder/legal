'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export type RegisterResult = { success: true } | { success: false; message: string }

// Registration always creates an 'assistant' profile; an admin promotes the
// user afterwards from the user-management panel. The role never comes from
// the client (the old flow let anyone self-select 'admin').
export async function registerAction(input: {
  email: string
  password: string
  fullName: string
  phone: string
}): Promise<RegisterResult> {
  const email = input.email.trim()
  const fullName = input.fullName.trim()
  const phone = input.phone.trim()

  if (!email || !input.password || !fullName) {
    return { success: false, message: 'Completá nombre, email y contraseña.' }
  }
  if (input.password.length < 6) {
    return { success: false, message: 'La contraseña debe tener al menos 6 caracteres.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || process.env.NEXT_PUBLIC_SITE_URL || undefined,
      data: { full_name: fullName, phone },
    },
  })

  if (error) {
    console.error('Register error:', error.message)
    return { success: false, message: error.message }
  }
  if (!data.user) {
    return { success: false, message: 'No fue posible crear la cuenta. Intenta nuevamente.' }
  }

  const svc = createServiceClient()
  const { error: profileError } = await svc.from('users').insert({
    id: data.user.id,
    email,
    full_name: fullName,
    phone: phone || null,
    role: 'assistant',
  })

  // 23505 = profile already exists (e.g. retried signup) — not a failure
  if (profileError && profileError.code !== '23505') {
    console.error('Error creating user profile:', profileError)
    return { success: false, message: 'La cuenta se creó pero el perfil no pudo guardarse. Contactá a un administrador.' }
  }

  return { success: true }
}
