/**
 * POST /api/v1/billing/checkout
 *
 * Creates a checkout session for a billing plan
 * Requires organization access
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { checkoutRequestSchema, checkoutResponseSchema } from '@/schemas/billing/billing-schemas'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import { BillingCheckoutError, createCheckoutSession } from '@/services/billing/billing-checkout.service'
import { logger } from '@/lib/utils/logger'
import { apiError, apiSuccess } from '@/lib/utils/api-response'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/billing/checkout')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId || !auth.userId) {
    return apiError(auth.error || 'Unauthorized', 403)
  }

  try {
    const body = await request.json()
    const parsed = checkoutRequestSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Invalid request parameters', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const origin = request.nextUrl.origin || request.headers.get('origin') || 'http://localhost:3000'

    const checkoutSession = await createCheckoutSession({
      organizationId: auth.organizationId,
      userId: auth.userId,
      planType: parsed.data.planType,
      origin,
      redirectPath: parsed.data.redirectPath,
    })

    const response = checkoutResponseSchema.parse({
      url: checkoutSession.url,
      provider: checkoutSession.provider,
    })

    logger.info({ context: response.url }, '[API/Checkout] Session created successfully. Redirect URL')
    return apiSuccess(response)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError('Invalid request body', 400)
    }

    if (error instanceof BillingCheckoutError) {
      return apiError(error.message, error.status)
    }

    logger.error({ err: error }, 'Checkout creation error')
    return apiError('Failed to create checkout session', 500, error)
  }
}
