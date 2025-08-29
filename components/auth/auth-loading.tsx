import { Scale } from "lucide-react"

interface AuthLoadingProps {
  message?: string
}

export function AuthLoading({ message = "Authenticating..." }: AuthLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Scale className="h-8 w-8 text-primary animate-pulse" />
          <h1 className="text-2xl font-bold text-foreground">LegalStudio</h1>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
          <span className="ml-2">{message}</span>
        </div>
      </div>
    </div>
  )
}
