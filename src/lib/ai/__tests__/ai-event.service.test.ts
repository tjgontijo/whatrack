import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  leadFindUniqueMock,
  ticketFindUniqueMock,
  agentFindUniqueMock,
  eventCreateMock,
  eventFindManyMock,
  eventAggregateMock,
  eventGroupByMock,
} = vi.hoisted(() => ({
  leadFindUniqueMock: vi.fn(),
  ticketFindUniqueMock: vi.fn(),
  agentFindUniqueMock: vi.fn(),
  eventCreateMock: vi.fn(),
  eventFindManyMock: vi.fn(),
  eventAggregateMock: vi.fn(),
  eventGroupByMock: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    lead: { findUnique: leadFindUniqueMock },
    ticket: { findUnique: ticketFindUniqueMock },
    aiAgent: { findUnique: agentFindUniqueMock },
    aiEvent: {
      create: eventCreateMock,
      findMany: eventFindManyMock,
      aggregate: eventAggregateMock,
      groupBy: eventGroupByMock,
    },
  },
}))

import { record, getLeadTimeline, getUsageStats } from '@/lib/ai/services/ai-event.service'

describe('aiEventService.record', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an event with explicit organizationId', async () => {
    const created = { id: 'evt-1', type: 'MESSAGE_SENT', organizationId: 'org-1' }
    eventCreateMock.mockResolvedValue(created)

    const result = await record({
      organizationId: 'org-1',
      projectId: 'proj-1',
      type: 'MESSAGE_SENT',
    })

    expect(result.success).toBe(true)
    expect(eventCreateMock).toHaveBeenCalledOnce()
  })

  it('derives organizationId from lead when not provided', async () => {
    leadFindUniqueMock.mockResolvedValue({
      organizationId: 'org-from-lead',
      projectId: 'proj-from-lead',
    })
    eventCreateMock.mockResolvedValue({ id: 'evt-2', type: 'SKILL_EXECUTED' })

    const result = await record({
      leadId: 'lead-1',
      type: 'SKILL_EXECUTED',
    })

    expect(result.success).toBe(true)
    expect(eventCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 'org-from-lead' }),
      })
    )
  })

  it('fails when organizationId cannot be resolved', async () => {
    const result = await record({ type: 'MESSAGE_SENT' })

    expect(result.success).toBe(false)
    expect(eventCreateMock).not.toHaveBeenCalled()
  })

  it('does not expose an update method (append-only)', () => {
    const service = { record, getLeadTimeline, getUsageStats }
    expect((service as Record<string, unknown>).update).toBeUndefined()
    expect((service as Record<string, unknown>).delete).toBeUndefined()
  })
})

describe('aiEventService.getLeadTimeline', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns events ordered by createdAt desc', async () => {
    const events = [
      { id: 'e2', createdAt: new Date('2026-01-02') },
      { id: 'e1', createdAt: new Date('2026-01-01') },
    ]
    eventFindManyMock.mockResolvedValue(events)

    const result = await getLeadTimeline('lead-1')

    expect(result.success).toBe(true)
    expect(eventFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { leadId: 'lead-1' },
        orderBy: { createdAt: 'desc' },
      })
    )
  })
})

describe('aiEventService.getUsageStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('aggregates totals and breakdown by type for a project', async () => {
    eventAggregateMock.mockResolvedValue({
      _count: { _all: 42 },
      _sum: { inputTokens: 1000, outputTokens: 500, costUsd: 0.015 },
    })
    eventGroupByMock.mockResolvedValue([
      { type: 'MESSAGE_SENT', _count: { _all: 30 } },
      { type: 'SKILL_EXECUTED', _count: { _all: 12 } },
    ])

    const result = await getUsageStats({
      organizationId: 'org-1',
      projectId: 'proj-1',
      period: '7d',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalEvents).toBe(42)
      expect(result.data.byType).toHaveLength(2)
    }
  })

  it('scopes aggregation by projectId when provided', async () => {
    eventAggregateMock.mockResolvedValue({
      _count: { _all: 0 },
      _sum: { inputTokens: null, outputTokens: null, costUsd: null },
    })
    eventGroupByMock.mockResolvedValue([])

    await getUsageStats({ organizationId: 'org-1', projectId: 'proj-x', period: '30d' })

    expect(eventAggregateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ projectId: 'proj-x' }),
      })
    )
  })
})
