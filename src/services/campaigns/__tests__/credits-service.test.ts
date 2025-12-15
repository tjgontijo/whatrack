import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { addCredits, debitCredits, getTransactions } from '../credits-service'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaignCredits: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    campaignCreditTransaction: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((calls: any[]) => Promise.all(calls)),
  },
}))

describe('credits-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.campaignCredits.upsert).mockResolvedValue({
      id: 'credits-1',
      organizationId: 'org-1',
      balance: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)
  })

  it('addCredits incrementa saldo e cria transação', async () => {
    vi.mocked(prisma.campaignCredits.update).mockResolvedValue({
      id: 'credits-1',
      balance: 3000,
    } as any)

    await addCredits({
      organizationId: 'org-1',
      amountCents: 2000,
      description: 'Compra',
      paymentId: 'pay-1',
    })

    expect(prisma.campaignCredits.update).toHaveBeenCalledWith({
      where: { id: 'credits-1' },
      data: { balance: { increment: 2000 } },
    })
    expect(prisma.campaignCreditTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          creditsId: 'credits-1',
          amount: 2000,
          description: 'Compra',
          paymentId: 'pay-1',
        }),
      })
    )
  })

  it('debitCredits lança erro se saldo for insuficiente', async () => {
    vi.mocked(prisma.campaignCredits.upsert).mockResolvedValueOnce({
      id: 'credits-1',
      organizationId: 'org-1',
      balance: 500,
    } as any)

    await expect(
      debitCredits({ organizationId: 'org-1', amountCents: 1000, campaignId: 'cmp-1' })
    ).rejects.toThrow('Insufficient credits')
  })

  it('getTransactions pagina corretamente', async () => {
    vi.mocked(prisma.campaignCreditTransaction.findMany).mockResolvedValue([])
    vi.mocked(prisma.campaignCreditTransaction.count).mockResolvedValue(0)

    const result = await getTransactions({
      organizationId: 'org-1',
      page: 2,
      pageSize: 5,
    })

    expect(prisma.campaignCreditTransaction.findMany).toHaveBeenCalledWith({
      where: { creditsId: 'credits-1' },
      orderBy: { createdAt: 'desc' },
      skip: 5,
      take: 5,
    })
    expect(result).toEqual({ items: [], total: 0, page: 2, pageSize: 5 })
  })
})
