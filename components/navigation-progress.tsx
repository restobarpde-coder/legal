'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'

// Configuración de NProgress
NProgress.configure({
  minimum: 0.3,
  easing: 'ease',
  speed: 800,
  showSpinner: false,
})

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Progress bar completado cuando cambia la ruta
    NProgress.done()
  }, [pathname, searchParams])

  useEffect(() => {
    // Interceptar clicks en links para iniciar progress
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      
      if (link && link.href && !link.href.startsWith('#') && !link.target) {
        // Solo para navegación interna
        if (link.href.includes(window.location.origin)) {
          NProgress.start()
        }
      }
    }

    // Interceptar navegación programática
    const handleBeforeUnload = () => {
      NProgress.start()
    }

    document.addEventListener('click', handleClick)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('click', handleClick)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      NProgress.done()
    }
  }, [])

  return null
}