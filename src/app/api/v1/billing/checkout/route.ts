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
import { ensurePaymentProviders } from '@/lib/payments/init'
import { createCheckoutSessionWithProvider } from '@/services/billing/billing-checkout.service'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit check
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/billing/checkout')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Auth check
  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    // Initialize payment providers
    ensurePaymentProviders()

    // Parse and validate request body
    const body = await request.json()
    const validated = checkoutRequestSchema.parse(body)

    // Get the success and return URLs
    const origin = request.headers.get('origin') || 'http://localhost:3000'
    const successUrl = `${origin}/billing/success`
    const returnUrl = `${origin}/billing`

    // Create checkout session
    const checkoutSession = await createCheckoutSessionWithProvider({
      organizationId: auth.organizationId,
      planType: validated.planType,
      successUrl,
      returnUrl,
    })

    // Validate and return response
    const response = checkoutResponseSchema.parse({
      url: checkoutSession.url,
      provider: checkoutSession.provider,
    })

    logger.info({ context: response.url }, '[API/Checkout] Session created successfully. Redirect URL')
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    logger.error({ err: error }, 'Checkout creation error')

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
