'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useTransition } from 'react'

type PrefetchRouteOptions = {
  includeData?: boolean
}

export function useOptimizedNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  const prefetchData = useCallback((href: string) => {
    const dataPrefetchers: Record<string, () => Promise<unknown>> = {
      '/dashboard/cases': () =>
        queryClient.prefetchQuery({
          queryKey: ['cases', '', 'all', 'all'],
          queryFn: () => fetch('/api/cases', { cache: 'no-store' }).then((res) => {
            if (!res.ok) throw new Error('No se pudo precargar la página')
            return res.json()
          }),
          staleTime: 30_000,
        }),
      '/dashboard/clients': () =>
        queryClient.prefetchQuery({
          queryKey: ['clients', ''],
          queryFn: () => fetch('/api/clients', { cache: 'no-store' }).then((res) => {
            if (!res.ok) throw new Error('No se pudo precargar la página')
            return res.json()
          }),
          staleTime: 30_000,
        }),
    }
    // React Query deduplicates requests and retries stale or failed prefetches.
    void dataPrefetchers[href]?.()
  }, [queryClient])

  // Prefetch inteligente basado en la ruta destino (con dedupe)
  const prefetchRoute = useCallback(
    (href: string, options?: PrefetchRouteOptions) => {
      // Let Next.js manage expiration and deduplication of its route cache.
      router.prefetch(href)

      const shouldPrefetchData = options?.includeData ?? true
      if (!shouldPrefetchData) return

      prefetchData(href)
    },
    [router, prefetchData]
  )

  const prefetchCommonRoutes = useCallback(
    (routes: string[]) => {
      const schedule = (cb: () => void) => {
        const runtime = globalThis as typeof globalThis & {
          requestIdleCallback?: (callback: () => void) => number
        }

        if (typeof runtime.requestIdleCallback === 'function') {
          runtime.requestIdleCallback(cb)
          return
        }

        setTimeout(cb, 80)
      }

      schedule(() => {
        routes.forEach((route) => prefetchRoute(route, { includeData: false }))
      })
    },
    [prefetchRoute]
  )

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
    prefetchCommonRoutes,
    isPending,
    isCurrentRoute: (href: string) =>
      pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`)),
  }
}
