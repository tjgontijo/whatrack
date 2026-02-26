import { describe, expect, it, beforeEach, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  sale: {
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

import { createSale, listSales } from '@/services/sales/sale.service'

describe('sale.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calculates totalAmount from items and discount on create', async () => {
    prismaMock.sale.create.mockResolvedValueOnce({ id: 'sale-1' })

    await createSale({
      organizationId: 'org-1',
      userId: 'user-1',
      input: {
        discount: 1,
        items: [
          { name: 'Item A', quantity: 2, unitPrice: 10 },
          { name: 'Item B', quantity: 1, unitPrice: 5 },
        ],
      },
    })

    expect(prismaMock.sale.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          createdBy: 'user-1',
          totalAmount: 24,
        }),
      })
    )
  })

  it('lists sales with mapped payload and trimmed filters', async () => {
    prismaMock.sale.findMany.mockResolvedValueOnce([
      {
        id: 'sale-1',
        totalAmount: 120.5,
        status: 'completed',
        notes: 'first',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ])
    prismaMock.sale.count.mockResolvedValueOnce(1)

    const result = await listSales({
      organizationId: 'org-1',
      q: '  abc  ',
      page: 1,
      pageSize: 20,
      status: ' completed ',
      dateRange: '7d',
    })

    expect(prismaMock.sale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { organizationId: 'org-1' },
            expect.objectContaining({
              OR: [{ notes: { contains: 'abc', mode: 'insensitive' } }],
            }),
            expect.objectContaining({ status: 'completed' }),
            expect.objectContaining({
              createdAt: expect.objectContaining({
                gte: expect.any(Date),
                lte: expect.any(Date),
              }),
            }),
          ]),
        }),
      })
    )
    expect(result).toEqual({
      items: [
        {
          id: 'sale-1',
          totalAmount: 120.5,
          status: 'completed',
          notes: 'first',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    })
  })
})
