import { NextResponse } from 'next/server'

import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { BillingService, BillingNotificationService } from '@/services/billing'
import { prisma } from '@/lib/prisma'
import { cancelSubscriptionSchema, changePlanSchema } from '../schemas'

/**
 * GET /api/v1/billing/subscription
 *
 * Get the current active subscription for the organization.
 */
export async function GET(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json(
        { error: access.error ?? 'Access denied' },
        { status: 403 }
      )
    }

    const billingService = new BillingService()
    const subscription = await billingService.getActiveSubscription(
      access.organizationId
    )

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    return NextResponse.json(subscription)
  } catch (error) {
    console.error('[api/billing/subscription] GET error', error)
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/billing/subscription
 *
 * Cancel the current subscription.
 * Body: { immediate?: boolean } - If true, cancel immediately. Otherwise at period end.
 */
export async function DELETE(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json(
        { error: access.error ?? 'Access denied' },
        { status: 403 }
      )
    }

    // Parse optional body
    let immediate = false
    try {
      const json = await request.json()
      const parsed = cancelSubscriptionSchema.safeParse(json)
      if (parsed.success) {
        immediate = parsed.data.immediate
      }
    } catch {
      // No body or invalid JSON - use defaults
    }

    const billingService = new BillingService()

    // Get active subscription first
    const subscription = await billingService.getActiveSubscription(
      access.organizationId
    )

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    const canceled = await billingService.cancelSubscription(subscription.id, {
      immediate,
    })

    // Send cancellation email notification
    try {
      const billingCustomer = await prisma.billingCustomer.findFirst({
        where: { organizationId: access.organizationId },
        include: {
          organization: {
            include: {
              members: {
                where: { role: 'owner' },
                include: { user: { select: { email: true, name: true } } },
                take: 1,
              },
            },
          },
        },
      })

      const ownerMember = billingCustomer?.organization.members[0]
      const email = billingCustomer?.email || ownerMember?.user.email
      const name = billingCustomer?.name || ownerMember?.user.name

      if (email) {
        const notificationService = new BillingNotificationService()
        await notificationService.sendSubscriptionCanceled({
          email,
          customerName: name || undefined,
          planName: canceled.plan.name,
          endDate: canceled.currentPeriodEnd || new Date(),
        })
      }
    } catch (error) {
      console.error('[api/billing/subscription] Failed to send cancellation email', error)
    }

    return NextResponse.json(canceled)
  } catch (error) {
    console.error('[api/billing/subscription] DELETE error', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/billing/subscription
 *
 * Change subscription plan (upgrade or downgrade).
 * Body: { planId: string, interval?: 'monthly' | 'yearly' }
 */
export async function PUT(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json(
        { error: access.error ?? 'Access denied' },
        { status: 403 }
      )
    }

    const json = await request.json()
    const parsed = changePlanSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const billingService = new BillingService()

    // Get active subscription first
    const subscription = await billingService.getActiveSubscription(
      access.organizationId
    )

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Check if changing to the same plan
    if (subscription.planId === parsed.data.planId) {
      return NextResponse.json(
        { error: 'Already subscribed to this plan' },
        { status: 400 }
      )
    }

    const result = await billingService.changePlan({
      subscriptionId: subscription.id,
      newPlanId: parsed.data.planId,
      newInterval: parsed.data.interval,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/billing/subscription] PUT error', error)
    return NextResponse.json(
      { error: 'Failed to change subscription plan' },
      { status: 500 }
    )
  }
}
