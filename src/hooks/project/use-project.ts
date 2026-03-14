/**
 * Hook para obter o projeto ativo a partir do better-auth session
 *
 * Usa o authClient (better-auth/react) e expõe apenas o id do projeto.
 */
import { useSession } from '@/lib/auth/auth-client'

interface ProjectSummary {
  id: string
}

export function useProject(): {
  data: ProjectSummary | null
  isLoading: boolean
  error: unknown
} {
  const { data: session, isPending, error } = useSession()

  // Extract activeProjectId from session
  const activeProjectId =
    (session?.session as { activeProjectId?: string })?.activeProjectId ?? null

  const projectData: ProjectSummary | null = activeProjectId
    ? { id: activeProjectId }
    : null

  return {
    data: projectData,
    isLoading: isPending,
    error,
  }
}
