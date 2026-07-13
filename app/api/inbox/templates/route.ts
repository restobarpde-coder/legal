import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('inbox_whatsapp_templates').select('id, name, language_code, category').eq('is_active', true).order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  const body = await request.json()
  const name = String(body.name ?? '').trim()
  const languageCode = String(body.language_code ?? 'es').trim()
  if (!name) return NextResponse.json({ error: 'El nombre de la plantilla es obligatorio' }, { status: 400 })
  const { data, error } = await supabase.from('inbox_whatsapp_templates').insert({ name, language_code: languageCode, category: body.category ?? null }).select('id, name, language_code, category').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data }, { status: 201 })
}
