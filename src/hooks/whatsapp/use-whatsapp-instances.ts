'use client'

import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '@/hooks/organization/use-organization'
import { apiFetch } from '@/lib/api-client'


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
    const data = await apiFetch('/api/v1/whatsapp/instances', {
        orgId,
    })

    return data as InstancesResponse
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
