import { Prisma } from '../../../prisma/generated/prisma/client'

import { prisma } from '@/lib/prisma'

export type ProductsCostResult = {
  cost: number
  servicesCount: number
}

export async function buildProductsCost(where: Prisma.SaleWhereInput): Promise<ProductsCostResult> {
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
      productId: true,
    },
  })

  const productIds = Array.from(
    new Set(saleItems.map((item: { productId: string | null }) => item.productId).filter((id): id is string => Boolean(id))),
  )

  const products = productIds.length
    ? await prisma.$queryRaw<{ id: string; cost: number | null }[]>`
        SELECT "id", "cost"
        FROM "products"
        WHERE "id" IN (${Prisma.join(productIds)})
      `
    : []

  const productCostMap = new Map<string, number>()
  for (const product of products) {
    const numericCost = product.cost ?? 0
    productCostMap.set(product.id, Number.isFinite(numericCost) ? numericCost : 0)
  }

  let totalCost = 0
  let servicesCount = 0

  for (const item of saleItems) {
    const quantity = Number(item.quantity)
    const unitCost = item.productId ? productCostMap.get(item.productId) ?? 0 : 0
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
