'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { ZodSchema } from 'zod'

interface UseDataTableFiltersOptions<T extends Record<string, any>> {
  schema: ZodSchema
  defaults: T
}

interface UseDataTableFiltersReturn<T extends Record<string, any>> {
  filters: T
  activeCount: number
  updateFilter: <K extends keyof T>(key: K, value: T[K]) => void
  updateFilters: (updates: Partial<T>) => void
  clearFilters: () => void
  resetFilters: () => void
}

/**
 * useDataTableFilters - Manages table filters via URL search params
 *
 * Features:
 * - Stores filters in URL for shareability and bookmarking
 * - Automatic debounce for search input (handled by caller)
 * - Resets page to 1 when filter changes
 * - Zod schema validation
 * - TypeScript support
 *
 * @example
 * const { filters, updateFilter, clearFilters } = useDataTableFilters({
 *   schema: leadFiltersSchema,
 *   defaults: { q: '', dateRange: undefined }
 * })
 *
 * updateFilter('q', 'João') // Updates URL: ?q=João
 * clearFilters() // Resets all filters to defaults
 */
export function useDataTableFilters<T extends Record<string, any>>(
  options: UseDataTableFiltersOptions<T>
): UseDataTableFiltersReturn<T> {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { schema, defaults } = options

  // Parse current filters from URL
  const filters = useMemo(() => {
    const parsed: Record<string, any> = { ...defaults }

    for (const [key, defaultValue] of Object.entries(defaults)) {
      const paramValue = searchParams.get(key)

      if (paramValue !== null) {
        // Parse based on type of default value
        if (typeof defaultValue === 'boolean') {
          parsed[key] = paramValue === 'true'
        } else if (typeof defaultValue === 'number') {
          const num = parseInt(paramValue, 10)
          parsed[key] = isNaN(num) ? defaultValue : num
        } else {
          parsed[key] = paramValue
        }
      }
    }

    // Validate with schema
    try {
      return schema.parse(parsed) as T
    } catch (error) {
      console.warn('[useDataTableFilters] Validation error:', error)
      return defaults as T
    }
  }, [searchParams, defaults, schema]) as T

  // Count active filters
  const activeCount = useMemo(() => {
    let count = 0
    for (const [key, value] of Object.entries(filters)) {
      const defaultValue = defaults[key as keyof T]
      if (value !== defaultValue && value !== '' && value !== null && value !== undefined) {
        count++
      }
    }
    return count
  }, [filters, defaults])

  // Update single filter
  const updateFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      const newSearchParams = new URLSearchParams(searchParams)

      // Convert value to string or remove param
      if (value === '' || value === null || value === undefined) {
        newSearchParams.delete(String(key))
      } else {
        newSearchParams.set(String(key), String(value))
      }

      // Reset page to 1 when filter changes
      newSearchParams.set('page', '1')

      // Update URL
      const newUrl = new URL(window.location.href)
      newUrl.search = newSearchParams.toString()
      router.push(newUrl.toString().replace(newUrl.origin, ''))
    },
    [searchParams, router]
  )

  // Update multiple filters at once
  const updateFilters = useCallback(
    (updates: Partial<T>) => {
      const newSearchParams = new URLSearchParams(searchParams)

      for (const [key, value] of Object.entries(updates)) {
        if (value === '' || value === null || value === undefined) {
          newSearchParams.delete(key)
        } else {
          newSearchParams.set(key, String(value))
        }
      }

      // Reset page to 1 when filters change
      newSearchParams.set('page', '1')

      const newUrl = new URL(window.location.href)
      newUrl.search = newSearchParams.toString()
      router.push(newUrl.toString().replace(newUrl.origin, ''))
    },
    [searchParams, router]
  )

  // Clear all filters (reset to defaults)
  const clearFilters = useCallback(() => {
    const newSearchParams = new URLSearchParams()

    // Keep pagination params
    const page = searchParams.get('page')
    const pageSize = searchParams.get('pageSize')

    if (page) newSearchParams.set('page', page)
    if (pageSize) newSearchParams.set('pageSize', pageSize)

    const newUrl = new URL(window.location.href)
    newUrl.search = newSearchParams.toString()
    router.push(newUrl.toString().replace(newUrl.origin, ''))
  }, [searchParams, router])

  // Reset filters to defaults and clear pagination
  const resetFilters = useCallback(() => {
    const newUrl = new URL(window.location.href)
    newUrl.search = ''
    router.push(newUrl.toString().replace(newUrl.origin, ''))
  }, [router])

  return {
    filters,
    activeCount,
    updateFilter,
    updateFilters,
    clearFilters,
    resetFilters,
  }
}
