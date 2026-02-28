'use client'

import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '@/hooks/organization/use-organization'
import { ORGANIZATION_HEADER } from '@/lib/constants/http-headers'

export interface WhatsAppInstance {
    id: string
    displayPhone: string
    verifiedName: string
    status: string
    wabaId: string | null
    lastWebhookAt: string | null
}

interface InstancesResponse {
    items: WhatsAppInstance[]
}

async function fetchWhatsAppInstances(orgId: string): Promise<InstancesResponse> {
    const response = await fetch('/api/v1/whatsapp/instances', {
        headers: {
            [ORGANIZATION_HEADER]: orgId,
        },
    })

    if (!response.ok) {
        throw new Error('Falha ao buscar instâncias do WhatsApp')
    }

    return response.json()
}

/**
 * Hook centralizado para buscar instâncias do WhatsApp com cache distribuído.
 */
export function useWhatsAppInstances() {
    const { data: org } = useOrganization()

    return useQuery({
        queryKey: ['whatsapp-instances', org?.id],
        queryFn: () => fetchWhatsAppInstances(org!.id),
        enabled: !!org?.id,
        staleTime: 5 * 60 * 1000, // 5 minutos de cache
        gcTime: 10 * 60 * 1000,
        retry: 1,
    })
}
