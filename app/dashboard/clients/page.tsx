import { Suspense } from "react"
import { ClientsClient } from "@/components/clients-client"
import { Loader2 } from "lucide-react"

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Cargando clientes...</span>
    </div>
  )
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ClientsClient />
    </Suspense>
  )
}
