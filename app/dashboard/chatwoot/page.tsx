import ChatwootDashboard from '@/components/chatwoot-dashboard'

export default function ChatwootPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversaciones Chatwoot</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona las consultas y conversaciones recibidas desde Chatwoot
        </p>
      </div>
      
      <ChatwootDashboard />
    </div>
  )
}
