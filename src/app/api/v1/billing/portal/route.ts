/**
 * Billing Customer Portal
 *
 * Generates a URL for the Stripe Billing Portal where customers can manage their subscriptions.
 * POST /api/v1/billing/portal
 */

import { NextRequest } from 'next/server'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { prisma } from '@/lib/db/prisma'
import { portalRequestSchema, portalResponseSchema } from '@/schemas/billing/billing-schemas'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { ensurePaymentProviders, providerRegistry } from '@/lib/billing/providers/init'
import { resolveInternalPath } from '@/lib/utils/internal-path'

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
    const parsed = portalRequestSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Invalid request parameters', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const returnPath = resolveInternalPath(
      parsed.data.returnUrl,
      '/dashboard/billing',
    )
    const returnUrl = new URL(returnPath, req.nextUrl.origin).toString()

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

    if (!provider.createPortalSession) {
      return apiError('Portal session not supported for this provider', 400)
    }

    const portalUrl = await provider.createPortalSession(
      subscription.providerCustomerId,
      returnUrl
    )

    logger.info(
      { organizationId: access.organizationId },
      '[Portal] Generated billing portal URL'
    )

    return apiSuccess(portalResponseSchema.parse({ url: portalUrl }))
  } catch (error) {
    logger.error({ err: error }, '[Portal] Error generating portal URL')
    return apiError(
      'Failed to generate portal URL',
      500,
      error instanceof Error ? error.message : undefined
    )
  }
}
