'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Barra de progreso ligera nativa (View Transitions API de Next.js 15)
export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // La View Transition API ya está habilitada en next.config.mjs
    // Este componente ahora solo resetea estado si es necesario
  }, [pathname, searchParams])

  return null
}
