import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { salesByServiceResponseSchema } from '@/lib/schema/lead-tickets'
import type { DateRange } from '@/lib/date/dateRange'

export async function buildSalesByService(organizationId: string, dateRange?: DateRange) {
  const where: Prisma.SaleWhereInput = { organizationId, status: 'completed' }

  if (dateRange) {
    where.createdAt = { gte: dateRange.gte, lte: dateRange.lte }
  }

  const sales = await prisma.sale.findMany({
    where,
    select: {
      items: {
        select: {
          name: true,
          total: true,
        },
      },
    },
  })

  const accumulator = new Map<string, number>()

  for (const sale of sales) {
    for (const item of sale.items) {
      const key = item.name || 'Indefinido'
      const previous = accumulator.get(key) ?? 0
      const numericTotal = Number(item.total)
      accumulator.set(key, previous + (Number.isFinite(numericTotal) ? numericTotal : 0))
    }
  }

  const rows = Array.from(accumulator.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)

  const parsed = salesByServiceResponseSchema.parse({
    slices: rows.map((row) => ({
      id: row.name ?? 'indefinido',
      label: row.name ?? 'Indefinido',
      value: Number(row.value.toFixed(2)),
    })),
  })

  return parsed.slices
}
