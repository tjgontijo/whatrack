import { type NextRequest, NextResponse } from 'next/server'
import {
  billingPlanDetailSchema,
  billingPlanUpdateSchema,
} from '@/features/billing/schemas/billing-plan-schemas'
import {
  BillingPlanMutationError,
  updateBillingPlan,
} from '@/features/billing/services/billing-plan.service'
import { getBillingPlanDetail } from '@/features/billing/services/billing-plan-query.service'
import { requireAdmin } from '@/lib/auth/guards'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'


type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request)
    if (user instanceof NextResponse) return user

    const { id } = await context.params
    const result = await getBillingPlanDetail(id)

    if (!result) {
      return apiError('Plano não encontrado', 404)
    }

    return apiSuccess(billingPlanDetailSchema.parse(result))
  } catch (error) {
    logger.error({ err: error }, '[system/billing-plans/:id] Error')
    return apiError('Failed to fetch billing plan', 500, error)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin(request)
    if (user instanceof NextResponse) return user

    const body = await request.json()
    const parsed = billingPlanUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const { id } = await context.params
    const result = await updateBillingPlan(id, parsed.data, user.id)
    return apiSuccess(billingPlanDetailSchema.parse(result))
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError('JSON inválido', 400)
    }

    if (error instanceof BillingPlanMutationError) {
      return apiError(error.message, error.status)
    }

    logger.error({ err: error }, '[system/billing-plans/:id] Error')
    return apiError('Failed to update billing plan', 500, error)
  }
}
