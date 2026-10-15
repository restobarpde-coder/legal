import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/authz-server'
import { WHATSAPP_TEMPLATES } from '@/lib/inbox/whatsapp-templates'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('inbox_whatsapp_templates').select('id, name, language_code, category').eq('is_active', true).order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const customTemplates = (data ?? []).filter(template =>
    !WHATSAPP_TEMPLATES.some(builtin => builtin.name === template.name && builtin.language_code === template.language_code)
  )
  return NextResponse.json({ templates: [...WHATSAPP_TEMPLATES, ...customTemplates] })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole('admin')
  if (!auth.ok) return auth.response
  const supabase = await createClient()
  const body = await request.json()
  const name = String(body.name ?? '').trim()
  const languageCode = String(body.language_code ?? 'es').trim()
  if (!name) return NextResponse.json({ error: 'El nombre de la plantilla es obligatorio' }, { status: 400 })
  const { data, error } = await supabase.from('inbox_whatsapp_templates').insert({ name, language_code: languageCode, category: body.category ?? null }).select('id, name, language_code, category').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data }, { status: 201 })
}
