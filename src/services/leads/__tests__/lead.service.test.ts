import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  lead: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

import { createLead, LeadConflictError, listLeads } from '@/services/leads/lead.service'

describe('lead.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps Prisma unique conflict to LeadConflictError', async () => {
    prismaMock.lead.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['organizationId', 'phone'] },
    })

    await expect(
      createLead({
        organizationId: 'org-1',
        input: { phone: '5511999999999' },
      })
    ).rejects.toBeInstanceOf(LeadConflictError)
    await expect(
      createLead({
        organizationId: 'org-1',
        input: { phone: '5511999999999' },
      })
    ).rejects.toMatchObject({ field: 'phone' })
  })

  it('lists leads with uuid-aware search filter', async () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    prismaMock.lead.findMany.mockResolvedValueOnce([
      {
        id: uuid,
        name: 'Lead A',
        phone: '5511999999999',
        mail: null,
        waId: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ])
    prismaMock.lead.count.mockResolvedValueOnce(1)

    const payload = await listLeads({
      organizationId: 'org-1',
      q: uuid,
      page: 1,
      pageSize: 20,
      dateRange: undefined,
    })

    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { organizationId: 'org-1' },
            expect.objectContaining({
              OR: expect.arrayContaining([{ id: uuid }]),
            }),
          ]),
        }),
      })
    )
    expect(payload.total).toBe(1)
    expect(payload.items[0]?.id).toBe(uuid)
  })
})
