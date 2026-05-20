import "server-only"
import { prisma } from '@/lib/db/prisma'
import { DealLineItemInput } from '../schemas/deal.schemas'

export async function addDealLineItem(params: {
  organizationId: string
  dealId: string
  data: DealLineItemInput
}) {
  const { organizationId, dealId, data } = params

  const deal = await prisma.deal.findUnique({
    where: { id: dealId, organizationId },
    select: { id: true, projectId: true, dealValue: true },
  })

  if (!deal) throw new Error('Negociação não encontrada')

  // Calculate total if not provided or to ensure accuracy
  const total = (data.unitPrice * data.quantity) - (data.discountAmount || 0)

  const lineItem = await prisma.dealLineItem.create({
    data: {
      organizationId,
      projectId: deal.projectId,
      dealId,
      itemId: data.itemId,
      name: data.name,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      discountAmount: data.discountAmount,
      total: total,
      sortOrder: data.sortOrder,
    },
  })

  // Update Deal Value (ROAS focus: always have a total)
  // Optional: automatically update dealValue if it was null or user wants it
  const allItems = await prisma.dealLineItem.findMany({
    where: { dealId },
    select: { total: true },
  })
  const newTotal = allItems.reduce((sum, item) => sum + Number(item.total), 0)

  await prisma.deal.update({
    where: { id: dealId },
    data: { dealValue: newTotal },
  })

  return lineItem
}
