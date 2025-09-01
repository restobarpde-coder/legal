import { ClientForm } from "../client-form"
import { createClientAction } from "../actions"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Cliente</h1>
          <p className="text-muted-foreground">
            Registra un nuevo cliente en tu estudio jurídico.
          </p>
        </div>
      </div>
      
      {/* Form */}
      <div className="max-w-4xl">
        <ClientForm formAction={createClientAction} />
      </div>
    </div>
  )
}
