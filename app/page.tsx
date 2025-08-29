import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-primary"></div>
            <span className="text-xl font-bold">LegalManager</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/register">Registrarse</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Gestión Integral para <span className="text-primary">Estudios Jurídicos</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Administra clientes, casos, tareas y documentos de manera eficiente. La solución completa para la gestión de
            tu estudio jurídico.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button size="lg" asChild>
              <Link href="/auth/register">Comenzar Gratis</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/auth/login">Acceder</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">Todo lo que necesitas para tu estudio</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Herramientas profesionales diseñadas específicamente para abogados
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Clientes</CardTitle>
                  <CardDescription>Administra la información de tus clientes de manera centralizada</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Mantén un registro completo de todos tus clientes con datos de contacto, historial de casos y
                    documentación relevante.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Control de Casos</CardTitle>
                  <CardDescription>Seguimiento detallado de todos tus casos legales</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Organiza casos por tipo, estado y prioridad. Mantén un historial completo de cada proceso legal.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Calendario Integrado</CardTitle>
                  <CardDescription>Nunca pierdas una cita o fecha límite importante</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Programa audiencias, reuniones y recordatorios. Sincroniza con tu calendario personal.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Documentos</CardTitle>
                  <CardDescription>Almacena y organiza todos tus documentos legales</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Sube, categoriza y busca documentos fácilmente. Control de versiones y acceso seguro.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tareas y Recordatorios</CardTitle>
                  <CardDescription>Mantén el control de todas tus actividades</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Crea tareas, asigna responsables y recibe notificaciones para no olvidar nada importante.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Seguridad Avanzada</CardTitle>
                  <CardDescription>Protección de datos con los más altos estándares</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Encriptación de datos, control de acceso por roles y cumplimiento de normativas de privacidad.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">© 2024 LegalManager. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
