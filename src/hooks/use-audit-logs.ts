'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { OrgAuditLog } from '@prisma/client'

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
  params: Omit<AuditLogsInfiniteParams, 'enabled'>
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

  const response = await fetch(`/api/v1/organizations/me/audit-logs?${query.toString()}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    let message = 'Falha ao buscar audit logs'

    try {
      const body = (await response.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // Ignore parse errors and keep fallback message.
    }

    throw new Error(message)
  }

  return response.json() as Promise<AuditLogsPageResponse>
}

async function fetchAuditLogFilters(): Promise<AuditLogFiltersResponse> {
  const response = await fetch('/api/v1/organizations/me/audit-logs/filters', {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Falha ao carregar filtros de audit logs')
  }

  return response.json() as Promise<AuditLogFiltersResponse>
}

export function useAuditLogsInfinite(params: AuditLogsInfiniteParams) {
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
    queryKey: ['organization-audit-logs', normalizedParams],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchAuditLogsPage(Number(pageParam), normalizedParams),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, page) => acc + page.data.length, 0)
      return loaded < lastPage.total ? allPages.length + 1 : undefined
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
    enabled: params.enabled ?? true,
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

export function useAuditLogFilters(enabled = true) {
  return useQuery<AuditLogFiltersResponse>({
    queryKey: ['organization-audit-log-filters'],
    queryFn: fetchAuditLogFilters,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 0,
    enabled,
  })
}
