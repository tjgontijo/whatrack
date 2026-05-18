import { type NextRequest, NextResponse } from 'next/server'
import {
  billingPlanArchiveSchema,
  billingPlanDetailSchema,
} from '@/features/billing/schemas/billing-plan-schemas'
import {
  archiveBillingPlan,
  BillingPlanMutationError,
} from '@/features/billing/services/billing-plan.service'
import { requireAdmin } from '@/lib/auth/guards'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request)
    if (user instanceof NextResponse) return user

    const body = await request.json().catch(() => ({}))
    const parsed = billingPlanArchiveSchema.safeParse(body)

    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const { id } = await context.params
    const result = await archiveBillingPlan(id, user.id)
    return apiSuccess(billingPlanDetailSchema.parse(result))
  } catch (error) {
    if (error instanceof BillingPlanMutationError) {
      return apiError(error.message, error.status)
    }

    logger.error({ err: error }, '[system/billing-plans/:id/archive] Error')
    return apiError('Failed to archive billing plan', 500, error)
  }
}
