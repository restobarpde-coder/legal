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
            // Configuración para actualizaciones automáticas
            staleTime: 1000 * 60 * 5, // 5 minutos antes de considerar datos obsoletos
            refetchOnWindowFocus: true, // Refrescar cuando la ventana recibe foco
            refetchOnMount: true, // Refrescar al montar componente
            retry: 1, // Reintentar una vez en caso de error
          },
          mutations: {
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
