import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { NavigationProgress } from "@/components/navigation-progress"
import { Toaster } from "@/components/ui/sonner"
import { Suspense } from "react"
import "./globals.css"

// Configurar fuentes con display swap para evitar FOIT
const geistSans = GeistSans
const geistMono = GeistMono

export const metadata: Metadata = {
  title: "Estudio Jurídico MVP",
  description: "Sistema de gestión para estudios jurídicos",
  generator: "v0.app",
}

// Revalidación para reducir carga del servidor
export const revalidate = 300 // 5 minutos

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`font-sans ${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Suspense fallback={null}>
          <NavigationProgress />
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              {children}
              <Toaster />
            </ThemeProvider>
          </QueryProvider>
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
