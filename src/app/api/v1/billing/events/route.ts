/**
 * POST /api/v1/billing/events
 *
 * Record an event for metering/usage tracking
 * Used to track lead_qualified, purchase_confirmed, etc.
 * Requires organization access
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { eventRecordingRequestSchema, eventRecordingResponseSchema } from '@/schemas/billing/billing-schemas'
import { rateLimitMiddleware } from '@/lib/utils/rate-limit.middleware'
import { recordEvent, NoActiveSubscriptionError } from '@/services/billing/billing-metering.service'
import { logger } from '@/lib/utils/logger'
import { apiError, apiSuccess } from '@/lib/utils/api-response'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/billing/events')
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const auth = await validateFullAccess(request)
  if (!auth.hasAccess || !auth.organizationId) {
    return apiError(auth.error || 'Unauthorized', 403)
  }

  try {
    const body = await request.json()
    const parsed = eventRecordingRequestSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Invalid event type', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    await recordEvent({
      organizationId: auth.organizationId,
      eventType: parsed.data.eventType,
      externalId: parsed.data.externalId,
    })

    const response = eventRecordingResponseSchema.parse({
      recorded: true,
      timestamp: new Date().toISOString(),
    })

    return apiSuccess(response, 201)
  } catch (error) {
    if (error instanceof NoActiveSubscriptionError) {
      return apiError('No active subscription found', 404)
    }

    if (error instanceof SyntaxError) {
      return apiError('Invalid request body', 400)
    }

    logger.error({ err: error }, 'Event recording error')
    return apiError('Failed to record event', 500, error)
  }
}
