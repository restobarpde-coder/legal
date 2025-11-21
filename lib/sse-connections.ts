// Gestión centralizada de conexiones SSE
const clients = new Map<string, ReadableStreamDefaultController>()

export function addClient(userId: string, controller: ReadableStreamDefaultController) {
  clients.set(userId, controller)
}

export function removeClient(userId: string) {
  clients.delete(userId)
}

export function getClient(userId: string): ReadableStreamDefaultController | undefined {
  return clients.get(userId)
}

export function sendNotificationToUser(userId: string, notification: any): boolean {
  const controller = clients.get(userId)
  if (controller) {
    try {
      const encoder = new TextEncoder()
      const message = `data: ${JSON.stringify(notification)}\n\n`
      controller.enqueue(encoder.encode(message))
      return true
    } catch (error) {
      console.error('Error enviando notificación:', error)
      clients.delete(userId)
      return false
    }
  }
  return false
}

export function getActiveClientsCount(): number {
  return clients.size
}
