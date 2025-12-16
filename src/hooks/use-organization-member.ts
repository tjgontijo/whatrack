/**
 * Hook para obter o membro ativo da organização com role
 *
 * Usa react-query com cache de 5 minutos para evitar queries extras.
 * Busca da API do better-auth /organization/get-active-member
 */
import { useQuery } from '@tanstack/react-query'
import { isOwner, isAdmin, type RoleName } from '@/lib/auth/rbac/roles'

interface OrganizationMember {
  id: string
  userId: string
  organizationId: string
  role: RoleName
  createdAt: string
}

interface UseOrganizationMemberReturn {
  data: OrganizationMember | null
  isOwner: boolean
  isAdmin: boolean
  role: RoleName | null
  isLoading: boolean
  error: Error | null
}

// Query keys para gerenciamento de cache
export const organizationMemberKeys = {
  all: ['organization-member'] as const,
  active: () => [...organizationMemberKeys.all, 'active'] as const,
}

async function fetchActiveMember(): Promise<OrganizationMember | null> {
  const response = await fetch('/api/v1/auth/organization/get-active-member', {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 404) {
      return null
    }
    throw new Error('Erro ao buscar membro ativo')
  }

  return response.json()
}

export function useOrganizationMember(): UseOrganizationMemberReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: organizationMemberKeys.active(),
    queryFn: fetchActiveMember,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
  })

  const role = data?.role ?? null

  return {
    data: data ?? null,
    isOwner: isOwner(role),
    isAdmin: isAdmin(role),
    role,
    isLoading,
    error: error as Error | null,
  }
}
