import { beforeEach, describe, expect, it, vi } from 'vitest'
import Decimal from 'decimal.js'

const prismaMock = vi.hoisted(() => ({
  billingSubscription: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  billingEventUsage: {
    aggregate: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  billingCycleCloseout: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const createInvoiceItemMock = vi.hoisted(() => vi.fn())
const ensurePaymentProvidersMock = vi.hoisted(() => vi.fn())
const getActiveProviderMock = vi.hoisted(() =>
  vi.fn(() => ({
    getProviderId: () => 'stripe',
    createInvoiceItem: createInvoiceItemMock,
  })),
)

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/billing/providers/init', () => ({
  ensurePaymentProviders: ensurePaymentProvidersMock,
  providerRegistry: {
    getActive: getActiveProviderMock,
  },
}))

import {
  closeDueBillingCycles,
  closeExpiredSubscriptionCycleIfNeeded,
} from '@/services/billing/billing-overage-closeout.service'

describe('billing-overage-closeout.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.$transaction.mockImplementation(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
    )
    prismaMock.billingCycleCloseout.create.mockResolvedValue({
      id: 'closeout-1',
      status: 'processing',
    })
    prismaMock.billingCycleCloseout.update.mockResolvedValue({ id: 'closeout-1' })
    prismaMock.billingSubscription.update.mockResolvedValue({ id: 'sub-1' })
    prismaMock.billingEventUsage.updateMany.mockResolvedValue({ count: 2 })
  })

  it('creates an invoice item and resets the cycle when there is billable overage', async () => {
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      organizationId: 'org-1',
      provider: 'stripe',
      providerCustomerId: 'cus_123',
      eventLimitPerMonth: 200,
      overagePricePerEvent: new Decimal('0.25'),
      billingCycleStartDate: new Date('2026-03-01T00:00:00.000Z'),
      billingCycleEndDate: new Date('2026-03-31T00:00:00.000Z'),
      nextResetDate: new Date('2026-03-31T00:00:00.000Z'),
      trialEndsAt: null,
      plan: {
        name: 'Starter',
        currency: 'BRL',
      },
    })
    prismaMock.billingEventUsage.aggregate.mockResolvedValueOnce({
      _sum: { eventCount: 250 },
    })
    prismaMock.billingCycleCloseout.findUnique.mockResolvedValueOnce(null)
    prismaMock.billingEventUsage.findMany.mockResolvedValueOnce([
      { id: 'evt-201' },
      { id: 'evt-202' },
    ])
    createInvoiceItemMock.mockResolvedValueOnce({ id: 'ii_123' })

    const result = await closeExpiredSubscriptionCycleIfNeeded(
      'sub-1',
      new Date('2026-04-01T00:00:00.000Z'),
    )

    expect(ensurePaymentProvidersMock).toHaveBeenCalledTimes(1)
    expect(createInvoiceItemMock).toHaveBeenCalledWith({
      customerId: 'cus_123',
      amountInCents: 1250,
      currency: 'BRL',
      description: 'Excedente de eventos (50) - Starter - ciclo 2026-03',
      metadata: {
        closeoutId: 'closeout-1',
        subscriptionId: 'sub-1',
        organizationId: 'org-1',
        billingCycle: '2026-03',
        overageEvents: '50',
      },
      idempotencyKey: 'billing-closeout:closeout-1',
    })
    expect(prismaMock.billingEventUsage.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['evt-201', 'evt-202'] } },
      data: {
        isOverage: true,
        chargedAmount: new Decimal('0.25'),
      },
    })
    expect(result).toEqual({
      status: 'invoiced',
      subscriptionId: 'sub-1',
      closeoutId: 'closeout-1',
      overageEvents: 50,
      amountCharged: '12.5',
      providerInvoiceItemId: 'ii_123',
    })
  })

  it('skips overage billing for trial cycles and still advances the cycle', async () => {
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      organizationId: 'org-1',
      provider: 'stripe',
      providerCustomerId: 'cus_123',
      eventLimitPerMonth: 200,
      overagePricePerEvent: new Decimal('0.25'),
      billingCycleStartDate: new Date('2026-03-01T00:00:00.000Z'),
      billingCycleEndDate: new Date('2026-03-08T00:00:00.000Z'),
      nextResetDate: new Date('2026-03-08T00:00:00.000Z'),
      trialEndsAt: new Date('2026-03-08T00:00:00.000Z'),
      plan: {
        name: 'Starter',
        currency: 'BRL',
      },
    })
    prismaMock.billingEventUsage.aggregate.mockResolvedValueOnce({
      _sum: { eventCount: 230 },
    })
    prismaMock.billingCycleCloseout.findUnique.mockResolvedValueOnce(null)

    const result = await closeExpiredSubscriptionCycleIfNeeded(
      'sub-1',
      new Date('2026-03-08T00:00:00.000Z'),
    )

    expect(createInvoiceItemMock).not.toHaveBeenCalled()
    expect(result).toEqual({
      status: 'trial_skipped',
      subscriptionId: 'sub-1',
      closeoutId: 'closeout-1',
      overageEvents: 30,
      amountCharged: '7.5',
      providerInvoiceItemId: null,
    })
  })

  it('summarizes due cycle processing across subscriptions', async () => {
    prismaMock.billingSubscription.findMany.mockResolvedValueOnce([{ id: 'sub-1' }, { id: 'sub-2' }])

    prismaMock.billingSubscription.findUnique
      .mockResolvedValueOnce({
        id: 'sub-1',
        organizationId: 'org-1',
        provider: 'stripe',
        providerCustomerId: 'cus_123',
        eventLimitPerMonth: 200,
        overagePricePerEvent: new Decimal('0.25'),
        billingCycleStartDate: new Date('2026-03-01T00:00:00.000Z'),
        billingCycleEndDate: new Date('2026-03-31T00:00:00.000Z'),
        nextResetDate: new Date('2026-03-31T00:00:00.000Z'),
        trialEndsAt: null,
        plan: { name: 'Starter', currency: 'BRL' },
      })
      .mockResolvedValueOnce({
        id: 'sub-2',
        organizationId: 'org-2',
        provider: 'stripe',
        providerCustomerId: 'cus_456',
        eventLimitPerMonth: 500,
        overagePricePerEvent: new Decimal('0.18'),
        billingCycleStartDate: new Date('2026-03-01T00:00:00.000Z'),
        billingCycleEndDate: new Date('2026-03-31T00:00:00.000Z'),
        nextResetDate: new Date('2026-03-31T00:00:00.000Z'),
        trialEndsAt: null,
        plan: { name: 'Pro', currency: 'BRL' },
      })

    prismaMock.billingEventUsage.aggregate
      .mockResolvedValueOnce({ _sum: { eventCount: 210 } })
      .mockResolvedValueOnce({ _sum: { eventCount: 500 } })

    prismaMock.billingCycleCloseout.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)

    prismaMock.billingEventUsage.findMany.mockResolvedValueOnce([{ id: 'evt-1' }])
    createInvoiceItemMock.mockResolvedValueOnce({ id: 'ii_123' })

    const result = await closeDueBillingCycles(new Date('2026-04-01T00:00:00.000Z'))

    expect(result).toEqual({
      processed: 2,
      invoiced: 1,
      skippedTrial: 0,
      noOverage: 1,
      alreadyProcessed: 0,
    })
  })
})
