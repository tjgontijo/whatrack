import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  conversation: {
    findFirst: vi.fn(),
  },
  member: {
    findFirst: vi.fn(),
  },
  dealStage: {
    findFirst: vi.fn(),
  },
  deal: {
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  sale: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  lead: {
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const capiMock = vi.hoisted(() => ({
  sendEvent: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/features/meta-ads/services/capi.service', () => ({
  metaCapiService: capiMock,
}))

import {
  closeDeal,
  listDeals,
  updateDealAndTrackCapi,
} from '@/features/deals/services/deal.service'

describe('deal.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.$transaction.mockImplementation(async (input: unknown) => {
      if (typeof input === 'function') {
        return input({
          deal: { update: prismaMock.deal.update },
          sale: {
            findFirst: prismaMock.sale.findFirst,
            create: prismaMock.sale.create,
            update: prismaMock.sale.update,
          },
          lead: { update: prismaMock.lead.update },
        })
      }

      return Promise.all(input as Promise<unknown>[])
    })
  })

  it('lists deals and keeps filtered where clause', async () => {
    prismaMock.deal.findMany.mockResolvedValueOnce([
      {
        id: 'deal-1',
        status: 'open',
        windowOpen: true,
        windowExpiresAt: new Date('2026-01-15T00:00:00.000Z'),
        dealValue: 100,
        messagesCount: 2,
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        conversation: {
          lead: { id: 'lead-1', name: 'Lead', phone: '5511999999999', pushName: null },
        },
        stage: { id: 'stage-1', name: 'Novo', color: '#000000' },
        assignee: { id: 'user-1', name: 'User' },
        tracking: { utmSource: 'google', sourceType: 'meta', ctwaclid: 'ctwa-1' },
        messages: [{ timestamp: new Date('2026-01-12T00:00:00.000Z') }],
        _count: { sales: 1 },
      },
    ])
    prismaMock.deal.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
    prismaMock.deal.aggregate.mockResolvedValueOnce({ _sum: { dealValue: 100 } })

    const result = await listDeals({
      organizationId: 'org-1',
      q: 'lead',
      status: 'open',
      stageId: 'stage-1',
      page: 1,
      pageSize: 20,
    })

    expect(prismaMock.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              AND: expect.arrayContaining([{ organizationId: 'org-1' }]),
            }),
            { status: 'open' },
          ]),
        }),
      })
    )
    expect(result.total).toBe(1)
    expect(result.items[0]?.id).toBe('deal-1')
    expect(result.stats.totalDealValue).toBe(100)
  })

  it('triggers CAPI on stage change when stage maps to conversion event', async () => {
    prismaMock.deal.findFirst.mockResolvedValueOnce({ stageId: 'stage-old', status: 'open' })
    prismaMock.dealStage.findFirst.mockResolvedValueOnce({ id: 'stage-new' })
    prismaMock.deal.update.mockResolvedValueOnce({
      id: 'deal-1',
      status: 'open',
      windowOpen: true,
      windowExpiresAt: null,
      dealValue: 250,
      messagesCount: 4,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      conversation: {
        lead: { id: 'lead-1', name: 'Lead', phone: '5511999999999', pushName: null },
      },
      stage: { id: 'stage-new', name: 'Venda confirmada', color: '#00FF00' },
      assignee: { id: 'user-1', name: 'User' },
      tracking: { utmSource: null, sourceType: null, ctwaclid: null },
    })
    capiMock.sendEvent.mockResolvedValueOnce(undefined)

    await updateDealAndTrackCapi({
      organizationId: 'org-1',
      dealId: 'deal-1',
      stageId: 'stage-new',
    })

    expect(capiMock.sendEvent).toHaveBeenCalledWith(
      'deal-1',
      'Purchase',
      expect.objectContaining({
        eventId: 'purchase-deal-1',
        value: 250,
      })
    )
  })

  it('does not trigger CAPI when stage remains unchanged', async () => {
    prismaMock.deal.findFirst.mockResolvedValueOnce({ stageId: 'stage-same', status: 'open' })
    prismaMock.dealStage.findFirst.mockResolvedValueOnce({ id: 'stage-same' })
    prismaMock.deal.update.mockResolvedValueOnce({
      id: 'deal-1',
      status: 'open',
      windowOpen: true,
      windowExpiresAt: null,
      dealValue: null,
      messagesCount: 0,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      conversation: {
        lead: { id: 'lead-1', name: 'Lead', phone: '5511999999999', pushName: null },
      },
      stage: { id: 'stage-same', name: 'Em andamento', color: '#0000FF' },
      assignee: null,
      tracking: null,
    })

    await updateDealAndTrackCapi({
      organizationId: 'org-1',
      dealId: 'deal-1',
      stageId: 'stage-same',
    })

    expect(capiMock.sendEvent).not.toHaveBeenCalled()
  })

  it('closes won deal and updates lead counters', async () => {
    prismaMock.deal.findFirst.mockResolvedValueOnce({
      id: 'deal-1',
      status: 'open',
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
      leadId: 'lead-1',
    })
    prismaMock.deal.update.mockResolvedValueOnce({
      id: 'deal-1',
      status: 'closed_won',
      windowOpen: true,
      windowExpiresAt: null,
      dealValue: 300,
      closedAt: new Date('2026-01-12T00:00:00.000Z'),
      closedReason: 'Fechou',
      messagesCount: 5,
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
      updatedAt: new Date('2026-01-12T00:00:00.000Z'),
      conversation: {
        lead: { id: 'lead-1', name: 'Lead', phone: '5511999999999', pushName: null },
      },
      stage: { id: 'stage-1', name: 'Ganho', color: '#00FF00' },
      assignee: { id: 'user-1', name: 'User' },
      tracking: { utmSource: null, sourceType: null, ctwaclid: null },
      _count: { sales: 2 },
    })
    prismaMock.sale.findFirst.mockResolvedValueOnce(null)
    prismaMock.sale.create.mockResolvedValueOnce({ id: 'sale-1' })
    prismaMock.lead.update.mockResolvedValueOnce({})

    const result = await closeDeal({
      organizationId: 'org-1',
      dealId: 'deal-1',
      reason: 'won',
      dealValue: 300,
      closedReason: 'Fechou',
    })

    expect(prismaMock.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: {
        lifetimeValue: { increment: 300 },
        totalDeals: { increment: 1 },
      },
    })
    expect(prismaMock.sale.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        projectId: null,
        dealId: 'deal-1',
        totalAmount: 300,
        status: 'completed',
        statusChangedAt: expect.any(Date),
        notes: 'Fechou',
      },
      select: { id: true },
    })
    expect('data' in result && result.data.status).toBe('closed_won')
  })

  it('updates existing sale instead of duplicating on won close', async () => {
    prismaMock.deal.findFirst.mockResolvedValueOnce({
      id: 'deal-2',
      status: 'open',
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
      leadId: 'lead-2',
    })
    prismaMock.sale.findFirst.mockResolvedValueOnce({ id: 'sale-2' })
    prismaMock.sale.update.mockResolvedValueOnce({ id: 'sale-2' })
    prismaMock.deal.update.mockResolvedValueOnce({
      id: 'deal-2',
      status: 'closed_won',
      windowOpen: true,
      windowExpiresAt: null,
      dealValue: 500,
      closedAt: new Date('2026-01-12T00:00:00.000Z'),
      closedReason: 'Pagamento confirmado',
      messagesCount: 3,
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
      updatedAt: new Date('2026-01-12T00:00:00.000Z'),
      conversation: {
        lead: { id: 'lead-2', name: 'Lead 2', phone: '5511888888888', pushName: null },
      },
      stage: { id: 'stage-1', name: 'Ganho', color: '#00FF00' },
      assignee: null,
      tracking: null,
      _count: { sales: 1 },
    })
    prismaMock.lead.update.mockResolvedValueOnce({})

    await closeDeal({
      organizationId: 'org-1',
      dealId: 'deal-2',
      reason: 'won',
      dealValue: 500,
      closedReason: 'Pagamento confirmado',
    })

    expect(prismaMock.sale.create).not.toHaveBeenCalled()
    expect(prismaMock.sale.update).toHaveBeenCalledWith({
      where: { id: 'sale-2' },
      data: {
        projectId: null,
        totalAmount: 500,
        status: 'completed',
        statusChangedAt: expect.any(Date),
        notes: 'Pagamento confirmado',
      },
      select: { id: true },
    })
  })
})
