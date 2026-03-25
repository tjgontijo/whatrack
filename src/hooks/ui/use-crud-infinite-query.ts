'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useOrganization } from '@/hooks/organization/use-organization'
import { useProjectRouteContext } from '@/hooks/project/project-route-context'
import { apiFetch } from '@/lib/api-client'


interface ApiPage<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

interface UseCrudInfiniteQueryOptions {
  queryKey: string[]
  endpoint: string
  pageSize?: number
  filters?: Record<string, string | number | boolean | undefined | null>
  enabled?: boolean
}

interface UseCrudInfiniteQueryResult<T> {
  data: T[]
  total: number
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

export function useCrudInfiniteQuery<T>({
  queryKey,
  endpoint,
  pageSize = 30,
  filters = {},
  enabled = true,
}: UseCrudInfiniteQueryOptions): UseCrudInfiniteQueryResult<T> {
  const { data: org } = useOrganization()
  const routeContext = useProjectRouteContext()
  const organizationId = routeContext?.organizationId || org?.id
  const projectId = routeContext?.projectId

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteQuery<ApiPage<T>>({
      queryKey: [...queryKey, organizationId, projectId, pageSize, filters],
      queryFn: async ({ pageParam }) => {
        const queryParams = new URLSearchParams()
        queryParams.set('page', String(pageParam ?? 1))
        queryParams.set('pageSize', String(pageSize))

        if (projectId) {
          queryParams.set('projectId', projectId)
        }

        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null && value !== '') {
            queryParams.set(key, String(value))
          }
        }

        const data = await apiFetch(`${endpoint}?${queryParams.toString()}`, {
          orgId: organizationId,
          projectId: projectId ?? undefined,
        })
        return data as ApiPage<T>
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => {
        const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0)
        return loaded < lastPage.total ? allPages.length + 1 : undefined
      },
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 0,
      enabled: enabled && !!organizationId,
    })

  const flatData = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data])
  const total = data?.pages[0]?.total ?? 0

  return {
    data: flatData,
    total,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  }
}

