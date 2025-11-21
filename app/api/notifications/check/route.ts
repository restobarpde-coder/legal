import { NextRequest, NextResponse } from 'next/server'
import { checkAndSendNotifications } from '@/lib/notification-scheduler'
import { sendNotificationToUser } from '@/lib/sse-connections'

export const dynamic = 'force-dynamic'

// Este endpoint puede ser llamado por un cron job externo
// Para protegerlo, verifica un token de autorización
export async function POST(request: NextRequest) {
  try {
    // Verificar si la llamada viene de Vercel Cron
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron')
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key'
    
    // Permitir llamadas de Vercel Cron sin autenticación, o con Bearer token
    if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Ejecutar el scheduler
    const result = await checkAndSendNotifications(sendNotificationToUser)
    
    return NextResponse.json({
      success: true,
      message: `Revisadas ${result.total} tareas, enviadas ${result.sent} notificaciones`,
      ...result
    })
  } catch (error) {
    console.error('Error ejecutando scheduler:', error)
    return NextResponse.json(
      { error: 'Error ejecutando scheduler' },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificar el estado (sin ejecutar el scheduler)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Servicio de notificaciones activo',
    note: 'Use POST para ejecutar el scheduler'
  })
}
