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
            staleTime: 1000 * 60 * 15, // 15min (era 5min) - datos frescos por más tiempo
            gcTime: 1000 * 60 * 30, // 30min garbage collection
            refetchOnWindowFocus: false, // era true - evita refetches innecesarios
            refetchOnMount: false, // solo si data está stale
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
