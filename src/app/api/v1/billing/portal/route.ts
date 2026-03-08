/**
 * Billing Customer Portal
 *
 * Generates a URL for the Stripe Billing Portal where customers can manage their subscriptions.
 * POST /api/v1/billing/portal
 */

import { NextRequest, NextResponse } from 'next/server'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { prisma } from '@/lib/db/prisma'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { ensurePaymentProviders, providerRegistry } from '@/lib/billing/providers/init'

export async function POST(req: NextRequest) {
  try {
    // Ensure providers are initialized
    ensurePaymentProviders()

    // Validate access
    const access = await validatePermissionAccess(req, 'view:dashboard')
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    // Get return URL from request body
    const body = await req.json().catch(() => ({}))
    const returnUrl = (body.returnUrl as string) || '/dashboard/billing'

    // Find subscription for the organization
    const subscription = await prisma.billingSubscription.findUnique({
      where: { organizationId: access.organizationId },
    })

    if (!subscription) {
      return apiError('No active subscription found', 404)
    }

    if (!subscription.providerCustomerId) {
      return apiError('Missing provider customer ID', 400)
    }

    // Get the active provider and create portal session
    const provider = providerRegistry.getActive()

    if (provider.getProviderId() !== 'stripe') {
      return apiError('Customer portal only available for Stripe', 400)
    }

    // Cast to StripeProvider to access createPortalSession method
    const stripeProvider = provider as any // eslint-disable-line @typescript-eslint/no-explicit-any

    if (!stripeProvider.createPortalSession) {
      return apiError('Portal session not supported for this provider', 400)
    }

    const portalUrl = await stripeProvider.createPortalSession(
      subscription.providerCustomerId,
      returnUrl
    )

    logger.info(
      { organizationId: access.organizationId },
      '[Portal] Generated billing portal URL'
    )

    return NextResponse.json({ url: portalUrl })
  } catch (error) {
    logger.error({ err: error }, '[Portal] Error generating portal URL')
    return apiError(
      'Failed to generate portal URL',
      500,
      error instanceof Error ? error.message : undefined
    )
  }
}
