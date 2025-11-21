import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { NextRequest } from 'next/server'
import { addClient, removeClient } from '@/lib/sse-connections'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireAuth()

    const encoder = new TextEncoder()

    // Crear un stream para las notificaciones
    const stream = new ReadableStream({
      start(controller) {
        // Almacenar la conexión del cliente
        addClient(user.id, controller)

        // Enviar un mensaje inicial para confirmar la conexión
        const initialMessage = `data: ${JSON.stringify({ type: 'connected', message: 'Conectado al servidor de notificaciones' })}\n\n`
        controller.enqueue(encoder.encode(initialMessage))

        // Mantener la conexión viva con pings cada 30 segundos
        const intervalId = setInterval(() => {
          try {
            const ping = `data: ${JSON.stringify({ type: 'ping' })}\n\n`
            controller.enqueue(encoder.encode(ping))
          } catch (error) {
            clearInterval(intervalId)
            removeClient(user.id)
          }
        }, 30000)

        // Limpiar cuando el cliente se desconecta
        request.signal.addEventListener('abort', () => {
          clearInterval(intervalId)
          removeClient(user.id)
          try {
            controller.close()
          } catch (e) {
            // Stream ya cerrado
          }
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error en SSE:', error)
    return new Response('Error en la conexión', { status: 500 })
  }
}
