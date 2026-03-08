import { NextRequest, NextResponse } from 'next/server'

import { requireSuperAdmin } from '@/lib/auth/guards'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import {
  billingPlanHistoryQuerySchema,
  billingPlanHistoryResponseSchema,
} from '@/schemas/billing/billing-plan-schemas'
import { listBillingPlanHistory } from '@/services/billing/billing-plan-query.service'
import { logger } from '@/lib/utils/logger'

type RouteContext = {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSuperAdmin(request)
    if (user instanceof NextResponse) return user

    const parsed = billingPlanHistoryQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    )

    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const { id } = await context.params
    const result = await listBillingPlanHistory(id, parsed.data)
    return apiSuccess(billingPlanHistoryResponseSchema.parse(result))
  } catch (error) {
    logger.error({ err: error }, '[system/billing-plans/:id/history] Error')
    return apiError('Failed to fetch billing plan history', 500, error)
  }
}
