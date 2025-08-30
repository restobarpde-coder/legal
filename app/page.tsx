import { getUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Scale, Users, FileText, Calendar } from "lucide-react"
import Link from "next/link"

export default async function HomePage() {
  const user = await getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold">Estudio Jurídico MVP</h1>
          </div>
          <div className="space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Registrarse</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-balance">Gestiona tu estudio jurídico de manera eficiente</h2>
          <p className="text-xl text-muted-foreground mb-8 text-pretty max-w-2xl mx-auto">
            Sistema completo para la gestión de casos, clientes, documentos y tareas. Diseñado específicamente para
            estudios jurídicos pequeños y medianos.
          </p>
          <div className="space-x-4">
            <Button size="lg" asChild>
              <Link href="/register">Comenzar Ahora</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Gestión de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Mantén toda la información de tus clientes organizada y accesible.</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle>Control de Casos</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Seguimiento completo del progreso de cada caso legal.</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle>Gestión de Tareas</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Organiza y prioriza las tareas de tu equipo legal.</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Scale className="h-8 w-8 text-orange-600 mb-2" />
              <CardTitle>Documentos Legales</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Almacena y organiza todos tus documentos de forma segura.</CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
