"use client"

import type React from "react"
import { useEffect } from "react"
import { useActionState } from "react"
import { loginAction } from "./actions"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Scale } from "lucide-react"
import { toast } from "sonner"

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, {
    message: "",
  })

  useEffect(() => {
    if (state.message && state.message !== "Error de validación.") {
      toast.error("Error de autenticación", {
        description: state.message,
      })
    }
  }, [state])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md border-border shadow-lg">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Scale className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Iniciar Sesión</CardTitle>
                    <CardDescription className="text-muted-foreground">Accede a tu cuenta del estudio jurídico</CardDescription>
                </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                disabled={isPending}
                required
              />
              {state.errors?.email && <p className="text-sm text-red-500">{state.errors.email[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                disabled={isPending}
                required
              />
              {state.errors?.password && <p className="text-sm text-red-500">{state.errors.password[0]}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
