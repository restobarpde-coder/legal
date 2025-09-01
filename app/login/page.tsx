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
import PrismaticBurst from "@/components/ui/prismatic-burst-simple"

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
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden" 
             style={{ background: 'linear-gradient(135deg, #1f2937 0%, #374151 25%, #4b5563 50%, #374151 75%, #1f2937 100%)' }}>
            
            {/* Ondas grises animadas */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute w-96 h-96 -top-48 -left-48 rounded-full animate-spin" 
                     style={{ 
                         animationDuration: '20s',
                         background: 'conic-gradient(from 0deg, transparent, rgba(156, 163, 175, 0.3), transparent, rgba(209, 213, 219, 0.2), transparent)'
                     }} />
            </div>
            
            {/* Ondas grises secundarias */}
            <div className="absolute inset-0 opacity-15">
                <div className="absolute w-80 h-80 -bottom-40 -right-40 rounded-full animate-spin" 
                     style={{ 
                         animationDuration: '30s',
                         animationDirection: 'reverse',
                         background: 'conic-gradient(from 45deg, transparent, rgba(229, 231, 235, 0.4), transparent, rgba(156, 163, 175, 0.2), transparent)'
                     }} />
            </div>
            
            {/* Partículas grises flotantes */}
            <div className="absolute inset-0">
                <div className="absolute w-2 h-2 bg-gray-300/30 rounded-full animate-bounce top-1/4 left-1/4" 
                     style={{ animationDelay: '0s', animationDuration: '4s' }} />
                <div className="absolute w-1 h-1 bg-gray-400/40 rounded-full animate-bounce top-1/3 left-2/3" 
                     style={{ animationDelay: '1s', animationDuration: '5s' }} />
                <div className="absolute w-3 h-3 bg-gray-200/20 rounded-full animate-bounce top-2/3 left-1/3" 
                     style={{ animationDelay: '2s', animationDuration: '6s' }} />
                <div className="absolute w-1 h-1 bg-gray-300/35 rounded-full animate-bounce top-3/4 left-3/4" 
                     style={{ animationDelay: '0.5s', animationDuration: '4.5s' }} />
                <div className="absolute w-2 h-2 bg-gray-400/25 rounded-full animate-bounce top-1/2 left-1/6" 
                     style={{ animationDelay: '1.5s', animationDuration: '5.5s' }} />
            </div>
            
            {/* Ondas pulsantes grises */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute top-1/2 left-1/2 w-32 h-32 -mt-16 -ml-16 rounded-full animate-ping bg-gray-300" 
                     style={{ animationDuration: '6s' }} />
                <div className="absolute top-1/4 left-3/4 w-24 h-24 -mt-12 -ml-12 rounded-full animate-ping bg-gray-400" 
                     style={{ animationDuration: '8s', animationDelay: '2s' }} />
                <div className="absolute top-3/4 left-1/4 w-20 h-20 -mt-10 -ml-10 rounded-full animate-ping bg-gray-200" 
                     style={{ animationDuration: '7s', animationDelay: '4s' }} />
            </div>
            
            <Card className="w-full max-w-md border-border shadow-lg relative z-10 backdrop-blur-sm bg-background/90">
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
