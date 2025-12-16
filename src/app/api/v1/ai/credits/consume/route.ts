/**
 * POST /api/v1/ai/credits/consume
 * Consume credits for an AI action
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { aiCreditsService, AI_CREDIT_COSTS, type AIAction } from '@/services/credits'

const consumeSchema = z.object({
  action: z.enum(['followup_generation', 'ticket_analysis', 'response_suggestion']),
  ticketId: z.string().optional(),
  contactPhone: z.string().optional(),
  metadata: z
    .object({
      model: z.string().optional(),
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
      latencyMs: z.number().optional(),
    })
    .optional(),
})

export async function POST(req: Request) {
  const access = await validateFullAccess(req)

  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json(
      { error: access.error ?? 'Access denied' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const parsed = consumeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error },
      { status: 400 }
    )
  }

  const { action, ticketId, contactPhone, metadata } = parsed.data
  const amount = AI_CREDIT_COSTS[action as AIAction]

  try {
    const result = await aiCreditsService.consumeCredits({
      organizationId: access.organizationId,
      amount,
      action: action as AIAction,
      ticketId,
      contactPhone,
      metadata,
      triggeredBy: access.userId ? `user:${access.userId}` : 'system',
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to consume credits'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
