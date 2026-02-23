import { Prisma } from '../../../prisma/generated/prisma/client'

import { prisma } from '@/lib/prisma'

export type ItemsCostResult = {
  cost: number
  servicesCount: number
}

export async function buildItemsCost(where: Prisma.SaleWhereInput): Promise<ItemsCostResult> {
  const sales = await prisma.sale.findMany({
    where,
    select: { id: true },
  })

  if (!sales.length) {
    return { cost: 0, servicesCount: 0 }
  }

  const saleIds = sales.map((sale: { id: string }) => sale.id)

  const saleItems = await prisma.saleItem.findMany({
    where: { saleId: { in: saleIds } },
    select: {
      quantity: true,
      itemId: true,
    },
  })

  const itemIds = Array.from(
    new Set(
      saleItems
        .map((item: { itemId: string | null }) => item.itemId)
        .filter((id): id is string => Boolean(id))
    )
  )

  const items = itemIds.length
    ? await prisma.$queryRaw<{ id: string; cost: number | null }[]>`
        SELECT "id", "cost"
        FROM "items"
        WHERE "id" IN (${Prisma.join(itemIds)})
      `
    : []

  const itemCostMap = new Map<string, number>()
  for (const item of items) {
    const numericCost = item.cost ?? 0
    itemCostMap.set(item.id, Number.isFinite(numericCost) ? numericCost : 0)
  }

  let totalCost = 0
  let servicesCount = 0

  for (const item of saleItems) {
    const quantity = Number(item.quantity)
    const unitCost = item.itemId ? (itemCostMap.get(item.itemId) ?? 0) : 0
    const lineCost = unitCost * quantity

    if (Number.isFinite(lineCost)) {
      totalCost += lineCost
    }

    if (Number.isFinite(quantity)) {
      servicesCount += quantity
    }
  }

  return { cost: totalCost, servicesCount }
}
