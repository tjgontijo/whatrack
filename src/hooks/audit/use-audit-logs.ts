'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { OrgAuditLog } from '@generated/prisma/client'
import { useOrganization } from '@/hooks/organization/use-organization'
import { apiFetch } from '@/lib/api-client'


export const AUDIT_LOG_PERIOD_PRESETS = [
  'today',
  'yesterday',
  '3d',
  '7d',
  '15d',
  '30d',
  'thisMonth',
  'lastMonth',
  'custom',
] as const

export type AuditLogPeriodPreset = (typeof AUDIT_LOG_PERIOD_PRESETS)[number]

export interface AuditLogWithRelations extends OrgAuditLog {
  user: {
    id: string
    name: string
    email: string
    image: string | null
  } | null
  organization?: {
    id: string
    name: string
    slug: string
  } | null
}

export interface AuditLogsPageResponse {
  data: AuditLogWithRelations[]
  total: number
  page: number
  pageSize: number
}

interface AuditLogsInfiniteParams {
  periodPreset?: AuditLogPeriodPreset
  startDate?: string
  endDate?: string
  resourceType?: string
  pageSize?: number
  enabled?: boolean
}

export interface AuditLogFiltersResponse {
  resourceTypes: string[]
}



async function fetchAuditLogsPage(
  page: number,
  params: Omit<AuditLogsInfiniteParams, 'enabled'>,
  orgId: string
): Promise<AuditLogsPageResponse> {
  const query = new URLSearchParams()
  query.set('page', String(page))
  query.set('pageSize', String(params.pageSize ?? 50))

  const periodPreset = params.periodPreset ?? '7d'
  query.set('periodPreset', periodPreset)

  if (periodPreset === 'custom') {
    if (params.startDate) query.set('startDate', params.startDate)
    if (params.endDate) query.set('endDate', params.endDate)
  }

  if (params.resourceType) query.set('resourceType', params.resourceType)

  const data = await apiFetch(`/api/v1/organizations/me/audit-logs?${query.toString()}`, {
    orgId,
  })

  return data as AuditLogsPageResponse
}

async function fetchAuditLogFilters(orgId: string): Promise<AuditLogFiltersResponse> {
  const data = await apiFetch('/api/v1/organizations/me/audit-logs/filters', {
    orgId,
  })

  return data as AuditLogFiltersResponse
}


export function useAuditLogsInfinite(params: AuditLogsInfiniteParams) {
  const { data: org } = useOrganization()
  const orgId = org?.id

  const normalizedParams = useMemo(
    () => ({
      periodPreset: params.periodPreset ?? '7d',
      startDate: params.startDate?.trim() || undefined,
      endDate: params.endDate?.trim() || undefined,
      resourceType: params.resourceType?.trim() || undefined,
      pageSize: params.pageSize ?? 50,
    }),
    [params.periodPreset, params.startDate, params.endDate, params.resourceType, params.pageSize]
  )

  const query = useInfiniteQuery<AuditLogsPageResponse>({
    queryKey: ['organization-audit-logs', normalizedParams, orgId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchAuditLogsPage(Number(pageParam), normalizedParams, orgId!),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, page) => acc + page.data.length, 0)
      return loaded < lastPage.total ? allPages.length + 1 : undefined
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
    enabled: !!orgId && (params.enabled ?? true),
  })

  const logs = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data?.pages]
  )

  const total = query.data?.pages[0]?.total ?? 0

  return {
    ...query,
    logs,
    total,
  }
}

export function useAuditLogFilters(enabled = true, initialResourceTypes?: string[]) {
  const { data: org } = useOrganization()
  const orgId = org?.id

  return useQuery<AuditLogFiltersResponse>({
    queryKey: ['organization-audit-log-filters', orgId],
    queryFn: () => fetchAuditLogFilters(orgId!),
    initialData: initialResourceTypes ? { resourceTypes: initialResourceTypes } : undefined,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
    enabled: !!orgId && enabled,
  })
}
