'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5min - datos se marcan stale después de 5 min
            gcTime: 1000 * 60 * 30, // 30min garbage collection
            refetchOnWindowFocus: true, // refrescar al volver a la ventana
            refetchOnMount: 'always', // siempre refrescar al montar componente
            retry: 1,
            networkMode: 'online',
          },
          mutations: {
            retry: 1,
            networkMode: 'online',
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
