import { NextRequest, NextResponse } from 'next/server'

import { requireSuperAdmin } from '@/lib/auth/guards'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import {
  billingPlanDetailSchema,
  billingPlanSyncSchema,
} from '@/schemas/billing/billing-plan-schemas'
import { syncBillingPlanToStripe, BillingPlanStripeSyncError } from '@/services/billing/billing-plan-stripe-sync.service'
import { logger } from '@/lib/utils/logger'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSuperAdmin(request)
    if (user instanceof NextResponse) return user

    const body = await request.json().catch(() => ({}))
    const parsed = billingPlanSyncSchema.safeParse(body)

    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const { id } = await context.params
    const result = await syncBillingPlanToStripe(id, user.id, parsed.data)
    return apiSuccess(billingPlanDetailSchema.parse(result))
  } catch (error) {
    if (error instanceof BillingPlanStripeSyncError) {
      return apiError(error.message, error.status)
    }

    logger.error({ err: error }, '[system/billing-plans/:id/sync-stripe] Error')
    return apiError('Failed to sync billing plan with Stripe', 500, error)
  }
}
