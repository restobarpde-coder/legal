'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useTransition } from 'react'

export function useOptimizedNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // Prefetch inteligente basado en la ruta destino
  const prefetchRoute = useCallback((href: string) => {
    // Prefetch page component
    router.prefetch(href)
    
    // Prefetch data based on route
    const prefetchMap: Record<string, () => void> = {
      '/dashboard/cases': () => {
        queryClient.prefetchQuery({
          queryKey: ['cases'],
          queryFn: () => fetch('/api/cases').then(res => res.json()),
          staleTime: 1000 * 60 * 5,
        })
      },
      '/dashboard/clients': () => {
        queryClient.prefetchQuery({
          queryKey: ['clients'],
          queryFn: () => fetch('/api/clients').then(res => res.json()),
          staleTime: 1000 * 60 * 5,
        })
      },
      '/dashboard/tasks': () => {
        queryClient.prefetchQuery({
          queryKey: ['tasks'],
          queryFn: () => fetch('/api/tasks').then(res => res.json()),
          staleTime: 1000 * 60 * 5,
        })
      }
    }
    
    prefetchMap[href]?.()
  }, [router, queryClient])

  // Navegación optimizada con transición
  const navigate = useCallback((href: string, options?: { replace?: boolean }) => {
    if (href === pathname) return
    
    startTransition(() => {
      if (options?.replace) {
        router.replace(href)
      } else {
        router.push(href)
      }
    })
  }, [router, pathname, startTransition])

  // Navegación con prefetch automático - SIN delay
  const navigateWithPrefetch = useCallback((href: string, options?: { replace?: boolean }) => {
    prefetchRoute(href)
    // Navegar inmediatamente, el prefetch ya se hizo en hover/focus
    navigate(href, options)
  }, [navigate, prefetchRoute])

  return {
    navigate,
    navigateWithPrefetch,
    prefetchRoute,
    isPending,
    isCurrentRoute: (href: string) => pathname === href
  }
}