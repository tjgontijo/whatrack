import type { Prisma } from '@prisma/client'

import type { DateRange } from '@/lib/date/dateRange'
import { isDateRangePreset, resolveDateRange } from '@/lib/date/dateRange'

export const NO_TRAFFIC_SOURCE_VALUE = '__no-source__'

export type SummaryFilters = {
  period?: string
  trafficSource?: string
  trafficType?: string
  product?: string
}

export function resolveFiltersDateRange(filters: SummaryFilters): DateRange | undefined {
  if (!filters.period || filters.period === 'custom') {
    return undefined
  }

  if (!isDateRangePreset(filters.period)) {
    return undefined
  }

  return resolveDateRange(filters.period)
}

export function buildSalesWhere(filters: SummaryFilters): Prisma.SaleWhereInput {
  const andConditions: Prisma.SaleWhereInput[] = []
  const dateRange = resolveFiltersDateRange(filters)

  if (dateRange) {
    andConditions.push({ createdAt: { gte: dateRange.gte, lte: dateRange.lte } })
  }

  if (filters.trafficSource && filters.trafficSource !== 'any') {
    if (filters.trafficSource === NO_TRAFFIC_SOURCE_VALUE) {
      andConditions.push({ ticket: { utmSource: null } })
    } else {
      andConditions.push({ ticket: { utmSource: filters.trafficSource } })
    }
  }

  if (filters.trafficType && filters.trafficType !== 'any') {
    const trafficType = filters.trafficType as 'paid' | 'organic'
    andConditions.push({ ticket: { sourceType: trafficType } })
  }

  if (filters.product && filters.product !== 'any') {
    andConditions.push({
      items: {
        some: {
          productId: filters.product
        }
      }
    })
  }

  if (!andConditions.length) {
    return {}
  }

  return andConditions.length === 1 ? andConditions[0] : { AND: andConditions }
}
