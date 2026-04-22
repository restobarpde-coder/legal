'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useTransition } from 'react'

type PrefetchRouteOptions = {
  includeData?: boolean
}

export function useOptimizedNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const prefetchedRoutesRef = useRef<Set<string>>(new Set())
  const prefetchedDataRef = useRef<Set<string>>(new Set())

  const dataPrefetchers: Record<string, () => Promise<unknown>> = {
    '/dashboard/cases': () =>
      queryClient.prefetchQuery({
        queryKey: ['cases', '', 'all', 'all'],
        queryFn: () => fetch('/api/cases', { cache: 'no-store' }).then((res) => res.json()),
        staleTime: 0,
      }),
    '/dashboard/clients': () =>
      queryClient.prefetchQuery({
        queryKey: ['clients', ''],
        queryFn: () => fetch('/api/clients', { cache: 'no-store' }).then((res) => res.json()),
        staleTime: 0,
      }),
  }

  // Prefetch inteligente basado en la ruta destino (con dedupe)
  const prefetchRoute = useCallback(
    (href: string, options?: PrefetchRouteOptions) => {
      if (!prefetchedRoutesRef.current.has(href)) {
        router.prefetch(href)
        prefetchedRoutesRef.current.add(href)
      }

      const shouldPrefetchData = options?.includeData ?? true
      if (!shouldPrefetchData) return

      if (!prefetchedDataRef.current.has(href) && dataPrefetchers[href]) {
        prefetchedDataRef.current.add(href)
        void dataPrefetchers[href]()
      }
    },
    [router, queryClient]
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
        routes.forEach((route) => prefetchRoute(route))
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
