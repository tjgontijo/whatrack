/**
 * POST /api/v1/billing/checkout
 *
 * Creates an Asaas transparent checkout payment
 * Requires organization access
 */

import type { NextRequest, NextResponse } from 'next/server'
import {
  checkoutRequestSchema,
  checkoutResponseSchema,
} from '@/features/billing/schemas/billing-schemas'
import {
  BillingCheckoutError,
  createCheckoutSession,
} from '@/features/billing/services/billing-checkout.service'
import { CheckoutStatusTokenService } from '@/features/billing/services/checkout-status-token.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { env } from '@/lib/env/env'

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

    const session = checkoutSession as typeof checkoutSession & {
      pixAutomatic?: { authorizationId: string; [key: string]: unknown } | null
    }

    const enriched = {
      ...session,
      invoiceStatusToken: session.invoiceId
        ? CheckoutStatusTokenService.createInvoiceToken(session.invoiceId)
        : null,
      pixAutomatic: session.pixAutomatic
        ? {
            ...session.pixAutomatic,
            authorizationStatusToken: CheckoutStatusTokenService.createAuthorizationToken(
              session.pixAutomatic.authorizationId
            ),
          }
        : session.pixAutomatic,
    }

    const response = checkoutResponseSchema.parse(enriched)

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
    return apiError('Failed to create checkout session', 500, error, {
      ...(env.NODE_ENV !== 'production'
        ? {
            debug: {
              name: error instanceof Error ? error.name : typeof error,
              message: error instanceof Error ? error.message : String(error),
            },
          }
        : {}),
    })
  }
}
