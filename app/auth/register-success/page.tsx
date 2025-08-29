import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function RegisterSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">¡Cuenta Creada!</CardTitle>
              <CardDescription>Verifica tu email para continuar</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Te hemos enviado un email de confirmación. Por favor, revisa tu bandeja de entrada y haz clic en el
                enlace para activar tu cuenta.
              </p>
              <Button asChild>
                <Link href="/auth/login">Ir al Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
