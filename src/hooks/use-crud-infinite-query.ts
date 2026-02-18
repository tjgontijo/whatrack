'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

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
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch,
    } = useInfiniteQuery<ApiPage<T>>({
        queryKey: [...queryKey, pageSize, filters],
        queryFn: async ({ pageParam }) => {
            const url = new URL(endpoint, window.location.origin)
            url.searchParams.set('page', String(pageParam ?? 1))
            url.searchParams.set('pageSize', String(pageSize))

            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.set(key, String(value))
                }
            }

            const res = await fetch(url.toString(), { cache: 'no-store' })
            if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`)
            return res.json() as Promise<ApiPage<T>>
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((acc, p) => acc + p.items.length, 0)
            return loaded < lastPage.total ? allPages.length + 1 : undefined
        },
        staleTime: 10_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 0,
        enabled,
    })

    const flatData = useMemo(
        () => data?.pages.flatMap((page) => page.items) ?? [],
        [data]
    )

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
