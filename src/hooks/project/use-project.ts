/**
 * Hook para obter o projeto ativo da aplicação
 *
 * Lee o activeProjectId do cookie PROJECT_COOKIE, que é gerenciado
 * pela aplicação (não pelo better-auth).
 *
 * O projeto ativo é selecionado pelo usuário no seletor de projeto
 * na sidebar e persistido via PATCH /api/v1/projects/current.
 */
import { useCallback, useEffect, useState } from 'react'
import { PROJECT_COOKIE } from '@/lib/constants/http-headers'

interface ProjectSummary {
  id: string
}

export function useProject(): {
  data: ProjectSummary | null
  isLoading: boolean
  error: unknown
} {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const getProjectIdFromCookie = useCallback(() => {
    if (typeof window === 'undefined') return null

    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${PROJECT_COOKIE}=`))
      ?.split('=')[1]

    return cookieValue || null
  }, [])

  useEffect(() => {
    const id = getProjectIdFromCookie()
    setProjectId(id)
    setIsLoading(false)
  }, [getProjectIdFromCookie])

  const projectData: ProjectSummary | null = projectId
    ? { id: projectId }
    : null

  return {
    data: projectData,
    isLoading,
    error: null,
  }
}
