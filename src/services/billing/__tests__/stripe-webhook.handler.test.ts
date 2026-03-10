import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'

const prismaMock = vi.hoisted(() => ({
  billingWebhookLog: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  billingSubscription: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  billingSubscriptionItem: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

const updateSubscriptionStatusMock = vi.hoisted(() => vi.fn())
const createSubscriptionMock = vi.hoisted(() => vi.fn())
const getBillingPlanBySlugMock = vi.hoisted(() => vi.fn())
const getBillingPlanByStripePriceIdMock = vi.hoisted(() => vi.fn())
const stripeRetrieveSubscriptionMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}))

vi.mock('@/services/billing/billing-subscription.service', () => ({
  updateSubscriptionStatus: updateSubscriptionStatusMock,
  createSubscription: createSubscriptionMock,
}))

vi.mock('@/services/billing/billing-plan-catalog.service', () => ({
  getBillingPlanBySlug: getBillingPlanBySlugMock,
  getBillingPlanByStripePriceId: getBillingPlanByStripePriceIdMock,
}))

vi.mock('stripe', () => ({
  default: class Stripe {
    subscriptions = {
      retrieve: stripeRetrieveSubscriptionMock,
    }
  },
}))

import { handleStripeWebhook } from '@/services/billing/handlers/stripe-webhook.handler'

describe('stripe-webhook.handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    prismaMock.billingWebhookLog.create.mockResolvedValue({ id: 'log-1' })
    prismaMock.billingWebhookLog.update.mockResolvedValue({ id: 'log-1', isProcessed: true })
    prismaMock.billingSubscriptionItem.findMany.mockResolvedValue([])
    prismaMock.billingSubscriptionItem.upsert.mockResolvedValue({})
    prismaMock.billingSubscriptionItem.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.billingSubscription.findUniqueOrThrow.mockResolvedValue({ id: 'sub-local-1' })

    getBillingPlanByStripePriceIdMock.mockImplementation((priceId: string) => {
      if (priceId === 'price_base') {
        return Promise.resolve({
          id: 'plan-base',
          slug: 'platform_base',
          name: 'WhaTrack Base',
          kind: 'base',
          addonType: null,
          monthlyPrice: { toString: () => '497.00' },
          currency: 'BRL',
        })
      }

      if (priceId === 'price_additional_project') {
        return Promise.resolve({
          id: 'plan-addon-project',
          slug: 'additional_project',
          name: 'Projeto adicional',
          kind: 'addon',
          addonType: 'project',
          monthlyPrice: { toString: () => '97.00' },
          currency: 'BRL',
        })
      }

      return Promise.resolve(null)
    })

    getBillingPlanBySlugMock.mockResolvedValue({
      id: 'plan-base',
      slug: 'platform_base',
      name: 'WhaTrack Base',
      kind: 'base',
      addonType: null,
      monthlyPrice: { toString: () => '497.00' },
      currency: 'BRL',
    })
  })

  it('hydrates a subscription from checkout completion using Stripe items', async () => {
    prismaMock.billingWebhookLog.findUnique.mockResolvedValueOnce(null)
    stripeRetrieveSubscriptionMock.mockResolvedValueOnce({
      id: 'sub_1',
      customer: 'cus_1',
      status: 'trialing',
      cancel_at_period_end: false,
      current_period_start: 1761955200,
      current_period_end: 1764547200,
      trial_end: 1764547200,
      metadata: {
        organizationId: 'org-1',
        planType: 'platform_base',
      },
      items: {
        data: [
          {
            id: 'si_base',
            quantity: 1,
            price: { id: 'price_base' },
          },
          {
            id: 'si_project',
            quantity: 2,
            price: { id: 'price_additional_project' },
          },
        ],
      },
    })

    const event = {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          customer: 'cus_1',
          subscription: 'sub_1',
          metadata: {
            organizationId: 'org-1',
            planType: 'platform_base',
          },
        },
      },
    } as unknown as Stripe.Event

    const result = await handleStripeWebhook(event)

    expect(createSubscriptionMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      planType: 'platform_base',
      provider: 'stripe',
      providerCustomerId: 'cus_1',
      providerSubscriptionId: 'sub_1',
      status: 'active',
      billingCycleStartDate: new Date('2025-11-01T00:00:00.000Z'),
      billingCycleEndDate: new Date('2025-12-01T00:00:00.000Z'),
      nextResetDate: new Date('2025-12-01T00:00:00.000Z'),
      trialEndsAt: new Date('2025-12-01T00:00:00.000Z'),
      canceledAtPeriodEnd: false,
    })
    expect(prismaMock.billingSubscriptionItem.upsert).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      processed: true,
      eventId: 'evt_1',
      message: 'Successfully processed checkout.session.completed webhook',
    })
  })

  it('marks a subscription as canceled on deletion webhook', async () => {
    prismaMock.billingWebhookLog.findUnique.mockResolvedValueOnce(null)
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-local-1',
    })

    const event = {
      id: 'evt_2',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_1',
        },
      },
    } as unknown as Stripe.Event

    const result = await handleStripeWebhook(event)

    expect(updateSubscriptionStatusMock).toHaveBeenCalledWith('sub-local-1', 'canceled')
    expect(result.processed).toBe(true)
  })

  it('marks the subscription as past due after payment failure', async () => {
    prismaMock.billingWebhookLog.findUnique.mockResolvedValueOnce(null)
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-local-2',
    })

    const event = {
      id: 'evt_3',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_1',
          subscription: 'sub_1',
        },
      },
    } as unknown as Stripe.Event

    const result = await handleStripeWebhook(event)

    expect(updateSubscriptionStatusMock).toHaveBeenCalledWith('sub-local-2', 'past_due')
    expect(result.processed).toBe(true)
  })
})
