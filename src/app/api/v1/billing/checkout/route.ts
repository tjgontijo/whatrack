/**
 * POST /api/v1/billing/checkout
 *
 * Creates an Asaas transparent checkout payment
 * Requires organization access
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { checkoutRequestSchema, checkoutResponseSchema } from '@/schemas/billing/billing-schemas'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import { BillingCheckoutError, createCheckoutSession } from '@/services/billing/billing-checkout.service'
import { logger } from '@/lib/utils/logger'
import { apiError, apiSuccess } from '@/lib/utils/api-response'

function getRequestIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    undefined
  )
}

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

    const checkoutSession = await createCheckoutSession({
      organizationId: auth.organizationId,
      userId: auth.userId,
      input: parsed.data,
      remoteIp: getRequestIp(request),
    })

    const response = checkoutResponseSchema.parse(checkoutSession)

    logger.info({ context: response }, '[API/Checkout] Asaas checkout created successfully')
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
