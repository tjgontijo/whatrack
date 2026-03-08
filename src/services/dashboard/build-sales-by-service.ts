import type { Prisma } from '@db/client'
import { prisma } from '@/lib/db/prisma'

export async function buildSalesByService(where: Prisma.SaleWhereInput) {
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

  const slices = Array.from(accumulator.entries())
    .map(([name, value]) => ({
      id: name,
      label: name,
      value: Number(value.toFixed(2)),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)

  return slices
}
