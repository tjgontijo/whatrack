'use client'

import { useQuery } from '@tanstack/react-query'
import { authClient } from '@/lib/auth/auth-client'
import { ORGANIZATION_HEADER } from '@/lib/constants'

export type MetaWhatsAppCredential = {
  id: string
  phoneNumberId: string
  wabaId: string
  phoneNumber: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type MetaCloudStatusResponse = {
  hasAddon: boolean
  credential: MetaWhatsAppCredential | null
}

export function useMetaCloudStatus() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const organizationId = activeOrg?.id

  const { data, isLoading, refetch } = useQuery<MetaCloudStatusResponse>({
    queryKey: ['whatsapp', 'meta-cloud', 'status', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      if (!organizationId) {
        return { hasAddon: false, credential: null }
      }

      const response = await fetch('/api/v1/whatsapp/meta-cloud/status', {
        headers: {
          [ORGANIZATION_HEADER]: organizationId,
        },
      })

      if (!response.ok) {
        return { hasAddon: false, credential: null }
      }

      return response.json()
    },
  })

  return {
    hasAddon: data?.hasAddon ?? false,
    isConfigured: !!data?.credential?.phoneNumberId,
    credential: data?.credential ?? null,
    isLoading,
    refetch,
  }
}
