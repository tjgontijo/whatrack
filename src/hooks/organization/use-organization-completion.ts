'use client'

import { useQuery } from '@tanstack/react-query'
import { INTEGRATION_IDENTITY_REQUIRED_MESSAGE, ORGANIZATION_HEADER } from '@/lib/constants/http-headers'
import { useOrganization } from '@/hooks/organization/use-organization'

export type OrganizationCompletionResponse = {
  hasOrganization: boolean
  identityComplete: boolean
  blockedModules?: string[]
}

type IntegrationModule = 'whatsapp' | 'metaAds'

async function fetchOrganizationCompletion(orgId: string): Promise<OrganizationCompletionResponse> {
  const response = await fetch('/api/v1/organizations/me/completion', {
    method: 'GET',
    headers: {
      [ORGANIZATION_HEADER]: orgId,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Falha ao validar dados da organização')
  }

  return response.json() as Promise<OrganizationCompletionResponse>
}

export function useOrganizationCompletion() {
  const { data: org } = useOrganization()

  const query = useQuery({
    queryKey: ['organizations', 'me', 'completion', org?.id],
    queryFn: () => fetchOrganizationCompletion(org!.id),
    staleTime: 5 * 60 * 1000, // 5 minutos (evitar chamadas redundantes)
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!org?.id,
  })

  const isModuleBlocked = (module: IntegrationModule) => {
    const payload = query.data
    if (!payload) return false
    if (!payload.hasOrganization || !payload.identityComplete) return true

    return payload.blockedModules?.includes(module) ?? false
  }

  return {
    ...query,
    isModuleBlocked,
    integrationBlockMessage: INTEGRATION_IDENTITY_REQUIRED_MESSAGE,
  }
}
