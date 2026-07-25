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
import { PWARegister } from "@/components/pwa-register"
import { Suspense } from "react"
import "./globals.css"

// Configurar fuentes con display swap para evitar FOIT
const geistSans = GeistSans
const geistMono = GeistMono

export const metadata: Metadata = {
  title: "CA - Plataforma Legal",
  description: "Plataforma de gestión legal optimizada para tablets y celulares",
  generator: "v0.app",
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CA Legal",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/placeholder-logo.png", sizes: "192x192", type: "image/png" },
      { url: "/placeholder-logo.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/placeholder-logo.png", sizes: "192x192" },
    ],
  },
  themeColor: "#ffffff",
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
          <PWARegister />
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
