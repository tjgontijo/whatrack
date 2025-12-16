'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth/auth-client'

/**
 * Hook para proteger rotas que requerem autenticação
 * Redireciona para login se não estiver autenticado
 */
export function useProtectedRoute() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    // Se não está carregando e não tem sessão, redirecionar
    if (!isPending && !session) {
      router.push('/sign-in')
    }
  }, [session, isPending, router])

  return {
    isLoading: isPending,
    isAuthenticated: !!session,
    session,
  }
}

/**
 * Hook para validar se o usuário é membro de uma organização
 */
export function useOrganizationAccess(organizationId: string) {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (isPending) return

    if (!session) {
      router.push('/sign-in')
      return
    }

    // TODO: Validar se o usuário é membro da organização
    // Isso será feito através de uma chamada à API
  }, [session, isPending, organizationId, router])

  return {
    isLoading: isPending,
    isAuthenticated: !!session,
    session,
  }
}
