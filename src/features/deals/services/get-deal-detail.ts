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
      _count: { select: { sales: true } },
    },
  })

  if (!deal) return null

  return {
    ...deal,
    windowExpiresAt: deal.windowExpiresAt?.toISOString() ?? null,
    stageEnteredAt: deal.stageEnteredAt?.toISOString() ?? null,
    createdAt: deal.createdAt.toISOString(),
    dealValue: deal.dealValue ? Number(deal.dealValue) : null,
    status: deal.status.name,
    salesCount: deal._count.sales,
    lastMessageAt: null,
    name: null,
    currency: 'BRL',
    lineItems: [],
  } as DealItem
}
