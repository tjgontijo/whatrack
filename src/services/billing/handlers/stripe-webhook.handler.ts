import { Prisma } from '@generated/prisma/client'
import Stripe from 'stripe'

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { createSubscription, updateSubscriptionStatus } from '../billing-subscription.service'
import { getBillingPlanBySlug, getBillingPlanByStripePriceId } from '../billing-plan-catalog.service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'

type StripeSubscriptionPlan = NonNullable<
  Awaited<ReturnType<typeof getBillingPlanByStripePriceId>>
>

async function createWebhookLog(provider: string, eventId: string, eventType: string, payload: unknown) {
  return prisma.billingWebhookLog.create({
    data: {
      provider,
      eventId,
      eventType,
      payload: payload as Prisma.InputJsonValue,
    },
  })
}

function mapStripeStatus(status: Stripe.Subscription.Status): 'active' | 'paused' | 'canceled' | 'past_due' {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    default:
      return 'paused'
  }
}

async function retrieveStripeSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId)
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const rawInvoice = invoice as Stripe.Invoice & {
    subscription?: string | { id?: string | null } | null
  }

  if (typeof rawInvoice.subscription === 'string') {
    return rawInvoice.subscription
  }

  return rawInvoice.subscription?.id ?? null
}

async function resolvePlansFromSubscription(subscription: Stripe.Subscription) {
  const resolved = await Promise.all(
    subscription.items.data.map(async (item) => {
      const priceId = item.price.id ?? null
      if (!priceId) return null
      const plan = await getBillingPlanByStripePriceId(priceId)
      return plan
        ? {
            plan,
            priceId,
            quantity: item.quantity ?? 0,
            stripeSubscriptionItemId: item.id,
          }
        : null
    }),
  )

  return resolved.filter(
    (
      item,
    ): item is {
      plan: StripeSubscriptionPlan
      priceId: string
      quantity: number
      stripeSubscriptionItemId: string
    } => Boolean(item),
  )
}

async function syncSubscriptionItems(input: {
  localSubscriptionId: string
  resolvedItems: Awaited<ReturnType<typeof resolvePlansFromSubscription>>
}) {
  const existing = await prisma.billingSubscriptionItem.findMany({
    where: { subscriptionId: input.localSubscriptionId },
    select: { id: true, planId: true },
  })

  const desiredPlanIds = new Set(input.resolvedItems.map((item) => item.plan.id))

  for (const item of input.resolvedItems) {
    await prisma.billingSubscriptionItem.upsert({
      where: {
        subscriptionId_planId: {
          subscriptionId: input.localSubscriptionId,
          planId: item.plan.id,
        },
      },
      update: {
        quantity: item.quantity,
        stripeSubscriptionItemId: item.stripeSubscriptionItemId,
        unitPrice: new Prisma.Decimal(item.plan.monthlyPrice.toString()),
        currency: item.plan.currency,
      },
      create: {
        subscriptionId: input.localSubscriptionId,
        planId: item.plan.id,
        quantity: item.quantity,
        stripeSubscriptionItemId: item.stripeSubscriptionItemId,
        unitPrice: new Prisma.Decimal(item.plan.monthlyPrice.toString()),
        currency: item.plan.currency,
      },
    })
  }

  const removableIds = existing
    .filter((item) => !desiredPlanIds.has(item.planId))
    .map((item) => item.id)

  if (removableIds.length > 0) {
    await prisma.billingSubscriptionItem.deleteMany({
      where: { id: { in: removableIds } },
    })
  }
}

export async function handleStripeWebhook(event: Stripe.Event): Promise<{
  processed: boolean
  eventId: string
  message: string
}> {
  const eventId = event.id
  const eventType = event.type as StripeWebhookEventType
  const processedAt = new Date()

  const existing = await prisma.billingWebhookLog.findUnique({
    where: { eventId },
  })

  if (existing && existing.isProcessed) {
    return {
      processed: false,
      eventId,
      message: 'Webhook already processed',
    }
  }

  const logId = existing?.id ?? (await createWebhookLog('stripe', eventId, eventType, event)).id

  try {
    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        logger.warn({ eventType }, '[Stripe] Unhandled webhook event')
        break
    }

    await prisma.billingWebhookLog.update({
      where: { id: logId },
      data: {
        isProcessed: true,
        processedAt,
      },
    })

    return {
      processed: true,
      eventId,
      message: `Successfully processed ${eventType} webhook`,
    }
  } catch (error) {
    await prisma.billingWebhookLog.update({
      where: { id: logId },
      data: {
        processingError: error instanceof Error ? error.message : String(error),
        retryCount: { increment: 1 },
        lastRetryAt: processedAt,
      },
    })

    throw error
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer?.toString()
  const subscriptionId = session.subscription?.toString()
  const organizationId = session.metadata?.organizationId
  const planType = session.metadata?.planType

  if (!customerId || !subscriptionId || !organizationId || !planType) {
    logger.warn(
      { sessionId: session.id, customerId, subscriptionId, organizationId, planType },
      '[Stripe] Missing checkout metadata',
    )
    return
  }

  const stripeSubscription = await retrieveStripeSubscription(subscriptionId)
  await handleSubscriptionUpsert(stripeSubscription)
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any
  const customerId = sub.customer?.toString()
  const organizationId = sub.metadata?.organizationId
  const resolvedItems = await resolvePlansFromSubscription(subscription)
  const baseItem = resolvedItems.find((item) => item.plan.kind === 'base')
  const basePlan =
    baseItem?.plan ??
    (sub.metadata?.planType ? await getBillingPlanBySlug(sub.metadata.planType as string) : null)

  if (!customerId || !organizationId || !basePlan) {
    logger.warn(
      { subscriptionId: subscription.id, customerId, organizationId, planId: basePlan?.id },
      '[Stripe] Missing customer, organization or base plan for subscription upsert',
    )
    return
  }

  const status = mapStripeStatus(subscription.status)
  const periodStartUnix =
    typeof sub.current_period_start === 'number'
      ? sub.current_period_start
      : sub.items?.data?.[0]?.current_period_start
  const periodEndUnix =
    typeof sub.current_period_end === 'number'
      ? sub.current_period_end
      : sub.items?.data?.[0]?.current_period_end

  const periodStart = new Date((periodStartUnix ?? Math.floor(Date.now() / 1000)) * 1000)
  const periodEnd = new Date((periodEndUnix ?? Math.floor(Date.now() / 1000)) * 1000)
  const trialEndsAt = sub.trial_end ? new Date((sub.trial_end as number) * 1000) : null

  await createSubscription({
    organizationId,
    planType: basePlan.slug,
    provider: 'stripe',
    providerCustomerId: customerId,
    providerSubscriptionId: subscription.id,
    status,
    billingCycleStartDate: periodStart,
    billingCycleEndDate: periodEnd,
    nextResetDate: periodEnd,
    trialEndsAt,
    canceledAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  })

  const localSubscription = await prisma.billingSubscription.findUniqueOrThrow({
    where: { organizationId },
    select: { id: true },
  })

  await syncSubscriptionItems({
    localSubscriptionId: localSubscription.id,
    resolvedItems,
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const existing = await prisma.billingSubscription.findUnique({
    where: { providerSubscriptionId: subscription.id },
    select: { id: true },
  })

  if (!existing) {
    return
  }

  await updateSubscriptionStatus(existing.id, 'canceled')
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice)

  if (!subscriptionId) {
    return
  }

  const stripeSubscription = await retrieveStripeSubscription(subscriptionId)
  await handleSubscriptionUpsert(stripeSubscription)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice)

  if (!subscriptionId) {
    return
  }

  const existing = await prisma.billingSubscription.findUnique({
    where: { providerSubscriptionId: subscriptionId },
    select: { id: true },
  })

  if (!existing) {
    return
  }

  await updateSubscriptionStatus(existing.id, 'past_due')
}
