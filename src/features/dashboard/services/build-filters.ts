import type { Prisma } from '@generated/prisma/client'

import type { DateRange } from '@/lib/date/date-range'
import { isDateRangePreset, resolveDateRange } from '@/lib/date/date-range'

export const NO_TRAFFIC_SOURCE_VALUE = '__no-source__'

export type SummaryFilters = {
  period?: string
  trafficSource?: string
  trafficType?: string
  itemCategory?: string
  item?: string
  projectId?: string | null
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

  if (filters.item && filters.item !== 'any') {
    andConditions.push({
      items: {
        some: {
          itemId: filters.item,
        },
      },
    })
  }

  if (filters.itemCategory && filters.itemCategory !== 'any') {
    andConditions.push({
      items: {
        some: {
          item: {
            categoryId: filters.itemCategory,
          },
        },
      },
    })
  }

  if (filters.projectId) {
    andConditions.push({ projectId: filters.projectId })
  }

  if (filters.trafficType && filters.trafficType !== 'any') {
    andConditions.push({
      ticket: {
        is: {
          tracking: {
            is: {
              sourceType: filters.trafficType,
            },
          },
        },
      },
    })
  }

  if (filters.trafficSource && filters.trafficSource !== 'any') {
    if (filters.trafficSource === NO_TRAFFIC_SOURCE_VALUE) {
      andConditions.push({
        ticket: {
          is: {
            tracking: {
              is: {
                utmSource: null,
              },
            },
          },
        },
      })
    } else {
      andConditions.push({
        ticket: {
          is: {
            tracking: {
              is: {
                utmSource: filters.trafficSource,
              },
            },
          },
        },
      })
    }
  }

  if (!andConditions.length) {
    return {}
  }

  return andConditions.length === 1 ? andConditions[0] : { AND: andConditions }
}
