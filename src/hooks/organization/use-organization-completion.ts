'use client'

import { useQuery } from '@tanstack/react-query'

import { INTEGRATION_IDENTITY_REQUIRED_MESSAGE } from '@/lib/constants/http-headers'

export type OrganizationCompletionResponse = {
  hasOrganization: boolean
  identityComplete: boolean
  blockedModules?: string[]
}

type IntegrationModule = 'whatsapp' | 'metaAds'

async function fetchOrganizationCompletion(): Promise<OrganizationCompletionResponse> {
  const response = await fetch('/api/v1/organizations/me/completion', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Falha ao validar dados da organização')
  }

  return response.json() as Promise<OrganizationCompletionResponse>
}

export function useOrganizationCompletion() {
  const query = useQuery({
    queryKey: ['organizations', 'me', 'completion'],
    queryFn: fetchOrganizationCompletion,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
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
