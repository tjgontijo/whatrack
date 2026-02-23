'use client'

import { useQuery } from '@tanstack/react-query'
import type { OrgAuditLog } from '@prisma/client'

export interface AuditLogWithUser extends OrgAuditLog {
    user: {
        id: string
        name: string
        email: string
        image: string | null
    } | null
}

export interface AuditLogsResponse {
    data: AuditLogWithUser[]
    total: number
    page: number
    pageSize: number
}

interface UseAuditLogsParams {
    page?: number
    pageSize?: number
    action?: string
    resourceType?: string
}

async function fetchAuditLogs(params: UseAuditLogsParams): Promise<AuditLogsResponse> {
    const query = new URLSearchParams()
    if (params.page) query.append('page', params.page.toString())
    if (params.pageSize) query.append('pageSize', params.pageSize.toString())
    if (params.action) query.append('action', params.action)
    if (params.resourceType) query.append('resourceType', params.resourceType)

    const response = await fetch(`/api/v1/organizations/me/audit-logs?${query.toString()}`)
    if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
    }
    return response.json()
}

export function useAuditLogs(params: UseAuditLogsParams) {
    return useQuery<AuditLogsResponse>({
        queryKey: ['audit-logs', params],
        queryFn: () => fetchAuditLogs(params),
        staleTime: 60 * 1000, // 1 minute
    })
}
