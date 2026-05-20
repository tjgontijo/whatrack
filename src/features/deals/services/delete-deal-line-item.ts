import "server-only"
import { prisma } from '@/lib/db/prisma'

export async function deleteDealLineItem(params: {
  organizationId: string
  dealId: string
  lineItemId: string
}) {
  const { organizationId, dealId, lineItemId } = params

  const lineItem = await prisma.dealLineItem.findUnique({
    where: { id: lineItemId, dealId, organizationId },
    select: { id: true },
  })

  if (!lineItem) throw new Error('Item não encontrado na negociação')

  const deleted = await prisma.dealLineItem.delete({
    where: { id: lineItemId },
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

  return deleted
}
