'use client'

import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '@/hooks/organization/use-organization'
import { useProjectRouteContext } from '@/hooks/project/project-route-context'
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

async function fetchWhatsAppInstances(orgId: string, projectId?: string): Promise<InstancesResponse> {
    const data = await apiFetch('/api/v1/whatsapp/instances', {
        orgId,
        projectId,
    })

    return data as InstancesResponse
}


/**
 * Hook centralizado para buscar instâncias do WhatsApp com cache distribuído.
 */
export function useWhatsAppInstances() {
    const { data: org } = useOrganization()
    const routeContext = useProjectRouteContext()
    const projectId = routeContext?.projectId

    return useQuery({
        queryKey: ['whatsapp-instances', org?.id, projectId],
        queryFn: () => fetchWhatsAppInstances(org!.id, projectId),
        enabled: !!org?.id,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
    })
}
