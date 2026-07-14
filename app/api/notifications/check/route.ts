import { NextRequest, NextResponse } from 'next/server'
import { checkAndSendNotifications } from '@/lib/notification-scheduler'

export const dynamic = 'force-dynamic'

// Los recordatorios corren principalmente vía pg_cron en Supabase
// (sql/20-notifications-reliability.sql). Este endpoint queda como respaldo
// diario desde Vercel Cron y para disparos manuales.
function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

async function runScheduler() {
  const result = await checkAndSendNotifications()
  return NextResponse.json({ success: true, ...result })
}

// Vercel Cron invoca con GET e incluye "Authorization: Bearer $CRON_SECRET"
// automáticamente cuando la variable de entorno está configurada.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    return await runScheduler()
  } catch (error) {
    console.error('Error ejecutando scheduler:', error)
    return NextResponse.json({ error: 'Error ejecutando scheduler' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
