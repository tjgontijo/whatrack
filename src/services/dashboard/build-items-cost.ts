import { Prisma } from '@generated/prisma/client'

import { prisma } from '@/lib/db/prisma'

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
    },
  })

  let servicesCount = 0

  for (const item of saleItems) {
    const quantity = Number(item.quantity)

    if (Number.isFinite(quantity)) {
      servicesCount += quantity
    }
  }

  return { cost: 0, servicesCount }
}
