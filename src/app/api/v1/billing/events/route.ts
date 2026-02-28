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

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit check (stricter for events)
  const rateLimitResponse = await rateLimitMiddleware(request, '/api/v1/billing/events')
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
    // Parse and validate request body
    const body = await request.json()
    const validated = eventRecordingRequestSchema.parse(body)

    // Record event
    await recordEvent({
      organizationId: auth.organizationId,
      eventType: validated.eventType,
      externalId: validated.externalId,
    })

    // Validate and return response
    const response = eventRecordingResponseSchema.parse({
      recorded: true,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    if (error instanceof NoActiveSubscriptionError) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    console.error('Event recording error:', error)
    return NextResponse.json(
      { error: 'Failed to record event' },
      { status: 500 }
    )
  }
}
