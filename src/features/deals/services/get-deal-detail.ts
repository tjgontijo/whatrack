import "server-only"
import { prisma } from '@/lib/db/prisma'
import { DealItem } from '../types'

export async function getDealDetail(params: {
  organizationId: string
  dealId: string
}): Promise<DealItem | null> {
  const deal = await prisma.deal.findUnique({
    where: {
      id: params.dealId,
      organizationId: params.organizationId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      expectedCloseDate: true,
      probabilityOverride: true,
      priority: true,
      temperature: true,
      nextStep: true,
      nextStepDueAt: true,
      currency: true,
      status: { select: { id: true, name: true } },
      windowOpen: true,
      windowExpiresAt: true,
      dealValue: true,
      messagesCount: true,
      position: true,
      stageEnteredAt: true,
      createdAt: true,
      lead: {
        select: { id: true, name: true, phone: true, pushName: true },
      },
      stage: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      assignee: { select: { id: true, name: true } },
      tracking: { select: { utmSource: true, sourceType: true, ctwaclid: true } },
      project: { select: { id: true, name: true } },
      lineItems: {
        select: {
          id: true,
          itemId: true,
          name: true,
          quantity: true,
          unitPrice: true,
          discountAmount: true,
          total: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { sales: true } },
    },
  })

  if (!deal) return null

  return {
    ...deal,
    expectedCloseDate: deal.expectedCloseDate?.toISOString() ?? null,
    nextStepDueAt: deal.nextStepDueAt?.toISOString() ?? null,
    windowExpiresAt: deal.windowExpiresAt?.toISOString() ?? null,
    stageEnteredAt: deal.stageEnteredAt?.toISOString() ?? null,
    createdAt: deal.createdAt.toISOString(),
    dealValue: deal.dealValue ? Number(deal.dealValue) : null,
    status: deal.status.name,
    salesCount: deal._count.sales,
    lastMessageAt: null,
    lineItems: deal.lineItems.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      discountAmount: item.discountAmount ? Number(item.discountAmount) : null,
      total: Number(item.total),
    })),
  } as DealItem
}
