import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  aiInsight: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

import { listAiInsights, rejectAiInsight } from '@/services/ai/ai-insight-query.service'

describe('ai-insight-query.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries insights with explicit select graph', async () => {
    prismaMock.aiInsight.findMany.mockResolvedValueOnce([])

    await listAiInsights('org-1', 'SUGGESTION')

    expect(prismaMock.aiInsight.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        status: 'SUGGESTION',
        ticket: {
          status: 'open',
        },
      },
      select: {
        id: true,
        organizationId: true,
        ticketId: true,
        status: true,
        payload: true,
        createdAt: true,
        updatedAt: true,
        agent: {
          select: {
            name: true,
            icon: true,
          },
        },
        ticket: {
          select: {
            id: true,
            conversationId: true,
            status: true,
            conversation: {
              select: {
                id: true,
                lead: {
                  select: {
                    name: true,
                    phone: true,
                    profilePicUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('returns 404 when rejecting an insight from another organization', async () => {
    prismaMock.aiInsight.findUnique.mockResolvedValueOnce({
      id: 'insight-1',
      organizationId: 'org-2',
      status: 'SUGGESTION',
    })

    const result = await rejectAiInsight('org-1', 'insight-1')

    expect(result).toEqual({ error: 'Insight não encontrado', status: 404 })
    expect(prismaMock.aiInsight.update).not.toHaveBeenCalled()
  })
})
