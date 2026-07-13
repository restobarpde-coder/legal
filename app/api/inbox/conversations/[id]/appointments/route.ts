import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type Params = Promise<{ id: string }>

export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { id: conversationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const title = String(body.title ?? '').trim()
  const startTime = String(body.start_time ?? '')
  const endTime = String(body.end_time ?? '')
  if (!title || !startTime || !endTime) return NextResponse.json({ error: 'Título, inicio y fin son obligatorios' }, { status: 400 })

  const { data: conversation } = await supabase.from('inbox_conversations').select('linked_client_id, linked_case_id, assigned_user_id, contact_name').eq('id', conversationId).single()
  if (!conversation) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
  const svc = createServiceClient()
  const { data: appointment, error } = await svc.from('appointments').insert({
    title, description: body.description ?? `Cita creada desde Mensajes: ${conversation.contact_name ?? ''}`,
    client_id: conversation.linked_client_id, case_id: conversation.linked_case_id,
    assigned_to: conversation.assigned_user_id ?? user.id, created_by: user.id,
    start_time: startTime, end_time: endTime, location: body.location ?? null, meeting_type: body.meeting_type ?? 'in_person', notes: body.notes ?? null,
  }).select('id, title, start_time, end_time').single()
  if (error || !appointment) return NextResponse.json({ error: error?.message ?? 'No fue posible crear la cita' }, { status: 500 })
  await svc.from('inbox_conversation_appointments').insert({ conversation_id: conversationId, appointment_id: appointment.id })
  await svc.from('inbox_conversations').update({ classification: 'appointment' }).eq('id', conversationId)
  return NextResponse.json({ appointment }, { status: 201 })
}
