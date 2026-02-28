'use client'

import * as React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache por 5 minutos por padrão - reduz ruído de rede
            staleTime: 5 * 60 * 1000,
            // Manter dados em cache por 10 minutos após ficarem "stale"
            gcTime: 10 * 60 * 1000,
            // Não refetch automaticamente ao focar janela (reduz ruído drástico ao mudar abas)
            refetchOnWindowFocus: false,
            // Retry apenas 1 vez em caso de erro
            retry: 1,
            // Não refetch ao montar se dados ainda são "fresh"
            refetchOnMount: false,
            // Desativar refetch ao reconectar se não for crítico
            refetchOnReconnect: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  )
}
