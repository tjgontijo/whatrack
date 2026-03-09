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
    update: vi.fn(),
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

    prismaMock.billingWebhookLog.create.mockResolvedValue({
      id: 'log-1',
    })
    prismaMock.billingWebhookLog.update.mockResolvedValue({
      id: 'log-1',
      isProcessed: true,
    })
    getBillingPlanByStripePriceIdMock.mockImplementation((priceId: string) => {
      if (priceId === 'price_test_starter_placeholder') {
        return Promise.resolve({
          id: 'plan-starter',
          slug: 'starter',
          eventLimitPerMonth: 200,
          overagePricePerEvent: 0.25,
        })
      }

      if (priceId === 'price_test_pro_placeholder') {
        return Promise.resolve({
          id: 'plan-pro',
          slug: 'pro',
          eventLimitPerMonth: 500,
          overagePricePerEvent: 0.18,
        })
      }

      return Promise.resolve(null)
    })
    getBillingPlanBySlugMock.mockImplementation((slug: string) => {
      if (slug === 'starter') {
        return Promise.resolve({
          id: 'plan-starter',
          slug: 'starter',
          eventLimitPerMonth: 200,
          overagePricePerEvent: 0.25,
        })
      }

      if (slug === 'pro') {
        return Promise.resolve({
          id: 'plan-pro',
          slug: 'pro',
          eventLimitPerMonth: 500,
          overagePricePerEvent: 0.18,
        })
      }

      return Promise.resolve(null)
    })
    stripeRetrieveSubscriptionMock.mockReset()
  })

  it('updates an existing subscription on checkout.session.completed', async () => {
    prismaMock.billingWebhookLog.findUnique.mockResolvedValueOnce(null)
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-local-1',
      organizationId: 'org-1',
    })
    prismaMock.billingSubscription.update.mockResolvedValueOnce({
      id: 'sub-local-1',
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
            planType: 'starter',
          },
        },
      },
    } as unknown as Stripe.Event

    const result = await handleStripeWebhook(event)

    expect(prismaMock.billingSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-local-1' },
      data: {
        providerCustomerId: 'cus_1',
        providerSubscriptionId: 'sub_1',
        provider: 'stripe',
      },
    })
    expect(createSubscriptionMock).not.toHaveBeenCalled()
    expect(result).toEqual({
      processed: true,
      eventId: 'evt_1',
      message: 'Successfully processed checkout.session.completed webhook',
    })
  })

  it('creates a subscription from customer.subscription.created metadata when it is missing locally', async () => {
    prismaMock.billingWebhookLog.findUnique.mockResolvedValueOnce(null)
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce(null)

    const event = {
      id: 'evt_2',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_1',
          customer: 'cus_1',
          status: 'active',
          cancel_at_period_end: false,
          current_period_start: 1761955200,
          current_period_end: 1764547200,
          items: {
            data: [
              {
                price: {
                  id: 'price_test_starter_placeholder',
                },
              },
            ],
          },
          metadata: {
            organizationId: 'org-1',
            planType: 'starter',
          },
        },
      },
    } as unknown as Stripe.Event

    const result = await handleStripeWebhook(event)

    expect(createSubscriptionMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      planType: 'starter',
      provider: 'stripe',
      providerCustomerId: 'cus_1',
      providerSubscriptionId: 'sub_1',
      status: 'active',
      billingCycleStartDate: new Date('2025-11-01T00:00:00.000Z'),
      billingCycleEndDate: new Date('2025-12-01T00:00:00.000Z'),
      nextResetDate: new Date('2025-12-01T00:00:00.000Z'),
      trialEndsAt: null,
      canceledAtPeriodEnd: false,
    })
    expect(result).toEqual({
      processed: true,
      eventId: 'evt_2',
      message: 'Successfully processed customer.subscription.created webhook',
    })
  })

  it('hydrates a missing local subscription from checkout.session.completed', async () => {
    prismaMock.billingWebhookLog.findUnique.mockResolvedValueOnce(null)
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce(null)
    stripeRetrieveSubscriptionMock.mockResolvedValueOnce({
      id: 'sub_2',
      customer: 'cus_2',
      status: 'trialing',
      cancel_at_period_end: false,
      current_period_start: 1761955200,
      current_period_end: 1764547200,
      trial_end: 1764547200,
      items: {
        data: [
          {
            price: {
              id: 'price_test_starter_placeholder',
            },
          },
        ],
      },
      metadata: {
        organizationId: 'org-2',
        planType: 'starter',
      },
    })

    const event = {
      id: 'evt_checkout_missing',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_2',
          customer: 'cus_2',
          subscription: 'sub_2',
          metadata: {
            organizationId: 'org-2',
            planType: 'starter',
          },
        },
      },
    } as unknown as Stripe.Event

    const result = await handleStripeWebhook(event)

    expect(stripeRetrieveSubscriptionMock).toHaveBeenCalledWith('sub_2')
    expect(createSubscriptionMock).toHaveBeenCalledWith({
      organizationId: 'org-2',
      planType: 'starter',
      provider: 'stripe',
      providerCustomerId: 'cus_2',
      providerSubscriptionId: 'sub_2',
      status: 'active',
      billingCycleStartDate: new Date('2025-11-01T00:00:00.000Z'),
      billingCycleEndDate: new Date('2025-12-01T00:00:00.000Z'),
      nextResetDate: new Date('2025-12-01T00:00:00.000Z'),
      trialEndsAt: new Date('2025-12-01T00:00:00.000Z'),
      canceledAtPeriodEnd: false,
    })
    expect(result).toEqual({
      processed: true,
      eventId: 'evt_checkout_missing',
      message: 'Successfully processed checkout.session.completed webhook',
    })
  })

  it('syncs the local plan when stripe sends a subscription update after a plan change', async () => {
    prismaMock.billingWebhookLog.findUnique.mockResolvedValueOnce(null)
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-local-1',
      organizationId: 'org-1',
      status: 'active',
      planType: 'starter',
    })
    prismaMock.billingSubscription.update.mockResolvedValueOnce({
      id: 'sub-local-1',
    })

    const event = {
      id: 'evt_4',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          customer: 'cus_1',
          status: 'active',
          cancel_at_period_end: false,
          current_period_start: 1761955200,
          current_period_end: 1764547200,
          items: {
            data: [
              {
                price: {
                  id: 'price_test_pro_placeholder',
                },
              },
            ],
          },
          metadata: {
            organizationId: 'org-1',
          },
        },
      },
    } as unknown as Stripe.Event

    const result = await handleStripeWebhook(event)

    const updateCall = prismaMock.billingSubscription.update.mock.calls[0]?.[0]

    expect(updateCall.where).toEqual({ id: 'sub-local-1' })
    expect(updateCall.data.planType).toBe('pro')
    expect(updateCall.data.eventLimitPerMonth).toBe(500)
    expect(updateCall.data.overagePricePerEvent.toString()).toBe('0.18')
    expect(updateCall.data.status).toBe('active')
    expect(result).toEqual({
      processed: true,
      eventId: 'evt_4',
      message: 'Successfully processed customer.subscription.updated webhook',
    })
  })

  it('marks a subscription active when invoice.paid arrives', async () => {
    prismaMock.billingWebhookLog.findUnique.mockResolvedValueOnce(null)
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-local-1',
      organizationId: 'org-1',
      status: 'past_due',
    })

    const event = {
      id: 'evt_3',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_1',
          subscription: 'sub_1',
        },
      },
    } as unknown as Stripe.Event

    const result = await handleStripeWebhook(event)

    expect(updateSubscriptionStatusMock).toHaveBeenCalledWith('sub-local-1', 'active')
    expect(result).toEqual({
      processed: true,
      eventId: 'evt_3',
      message: 'Successfully processed invoice.paid webhook',
    })
  })

  it('hydrates a missing local subscription when invoice.paid arrives before local creation', async () => {
    prismaMock.billingWebhookLog.findUnique.mockResolvedValueOnce(null)
    prismaMock.billingSubscription.findUnique.mockResolvedValueOnce(null)
    stripeRetrieveSubscriptionMock.mockResolvedValueOnce({
      id: 'sub_3',
      customer: 'cus_3',
      status: 'active',
      cancel_at_period_end: false,
      current_period_start: 1761955200,
      current_period_end: 1764547200,
      items: {
        data: [
          {
            price: {
              id: 'price_test_starter_placeholder',
            },
          },
        ],
      },
      metadata: {
        organizationId: 'org-3',
        planType: 'starter',
      },
    })

    const event = {
      id: 'evt_invoice_missing',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_2',
          subscription: 'sub_3',
        },
      },
    } as unknown as Stripe.Event

    const result = await handleStripeWebhook(event)

    expect(stripeRetrieveSubscriptionMock).toHaveBeenCalledWith('sub_3')
    expect(createSubscriptionMock).toHaveBeenCalledWith({
      organizationId: 'org-3',
      planType: 'starter',
      provider: 'stripe',
      providerCustomerId: 'cus_3',
      providerSubscriptionId: 'sub_3',
      status: 'active',
      billingCycleStartDate: new Date('2025-11-01T00:00:00.000Z'),
      billingCycleEndDate: new Date('2025-12-01T00:00:00.000Z'),
      nextResetDate: new Date('2025-12-01T00:00:00.000Z'),
      trialEndsAt: null,
      canceledAtPeriodEnd: false,
    })
    expect(result).toEqual({
      processed: true,
      eventId: 'evt_invoice_missing',
      message: 'Successfully processed invoice.paid webhook',
    })
  })
})
