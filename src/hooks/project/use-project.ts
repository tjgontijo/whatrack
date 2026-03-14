/**
 * Hook para obter o projeto ativo
 *
 * Prioriza: session.activeProjectId → cookie PROJECT_COOKIE
 * Usa fallback para cookie porque better-auth cliente não inclui
 * campos customizados automaticamente (activeProjectId é custom no servidor).
 */
import { useCallback, useEffect, useState } from 'react'
import { useSession } from '@/lib/auth/auth-client'
import { PROJECT_COOKIE } from '@/lib/constants/http-headers'

interface ProjectSummary {
  id: string
}

export function useProject(): {
  data: ProjectSummary | null
  isLoading: boolean
  error: unknown
} {
  const { data: session, isPending, error } = useSession()
  const [projectId, setProjectId] = useState<string | null>(null)

  const getProjectIdFromCookie = useCallback(() => {
    if (typeof window === 'undefined') return null

    const cookies = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${PROJECT_COOKIE}=`))
      ?.split('=')[1]

    return cookies || null
  }, [])

  useEffect(() => {
    // Try session first (filled by server if available)
    const sessionProjectId = (session?.session as { activeProjectId?: string })?.activeProjectId

    if (sessionProjectId) {
      setProjectId(sessionProjectId)
    } else {
      // Fallback to cookie
      const cookieProjectId = getProjectIdFromCookie()
      setProjectId(cookieProjectId)
    }
  }, [session?.session, getProjectIdFromCookie])

  const projectData: ProjectSummary | null = projectId
    ? { id: projectId }
    : null

  return {
    data: projectData,
    isLoading: isPending,
    error,
  }
}
