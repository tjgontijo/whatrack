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
import { auth as authClient } from '@/lib/auth/auth'
import { prisma } from '@/lib/db/prisma'
import { cookies } from 'next/headers'

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

    // Get user session to extract customer data
    const cookieStore = await cookies()
    const headers = new Headers({
      cookie: cookieStore
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join('; '),
    })

    const session = await authClient.api.getSession({ headers })
    if (!session?.user) {
      return NextResponse.json(
        { error: 'User session not found' },
        { status: 401 }
      )
    }

    // Fetch user profile to get billing information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        name: true,
        phone: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Validate required fields for customer creation
    if (!user.email || !user.name) {
      return NextResponse.json(
        { error: 'User email and name are required for checkout' },
        { status: 400 }
      )
    }

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
      userEmail: user.email,
      userName: user.name,
      userPhone: user.phone || undefined,
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
