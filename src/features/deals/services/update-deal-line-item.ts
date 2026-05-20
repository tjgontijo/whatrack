import "server-only"
import { prisma } from '@/lib/db/prisma'
import { DealLineItemInput } from '../schemas/deal.schemas'

export async function updateDealLineItem(params: {
  organizationId: string
  dealId: string
  lineItemId: string
  data: Partial<DealLineItemInput>
}) {
  const { organizationId, dealId, lineItemId, data } = params

  const existing = await prisma.dealLineItem.findUnique({
    where: { id: lineItemId, dealId, organizationId },
  })

  if (!existing) throw new Error('Item não encontrado')

  const unitPrice = data.unitPrice ?? Number(existing.unitPrice)
  const quantity = data.quantity ?? existing.quantity
  const discountAmount = data.discountAmount !== undefined ? (data.discountAmount ?? 0) : Number(existing.discountAmount || 0)

  const total = (unitPrice * quantity) - discountAmount

  const updated = await prisma.dealLineItem.update({
    where: { id: lineItemId },
    data: {
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      discountAmount: data.discountAmount,
      total: total,
      name: data.name,
      sortOrder: data.sortOrder,
    },
  })

  // Recalculate Deal Value
  const allItems = await prisma.dealLineItem.findMany({
    where: { dealId },
    select: { total: true },
  })
  const newTotal = allItems.reduce((sum, item) => sum + Number(item.total), 0)

  await prisma.deal.update({
    where: { id: dealId },
    data: { dealValue: newTotal },
  })

  return updated
}
