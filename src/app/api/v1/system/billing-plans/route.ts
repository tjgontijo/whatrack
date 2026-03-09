import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth/guards'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import {
  billingPlanCreateSchema,
  billingPlanListQuerySchema,
  billingPlanDetailSchema,
  billingPlanListResponseSchema,
} from '@/schemas/billing/billing-plan-schemas'
import { createBillingPlan, BillingPlanMutationError } from '@/services/billing/billing-plan.service'
import { listBillingPlans } from '@/services/billing/billing-plan-query.service'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request)
    if (user instanceof NextResponse) return user

    const parsed = billingPlanListQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    )

    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const result = await listBillingPlans(parsed.data)
    return apiSuccess(billingPlanListResponseSchema.parse(result))
  } catch (error) {
    logger.error({ err: error }, '[system/billing-plans] Error')
    return apiError('Failed to fetch billing plans', 500, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request)
    if (user instanceof NextResponse) return user

    const body = await request.json()
    const parsed = billingPlanCreateSchema.safeParse(body)

    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const result = await createBillingPlan(parsed.data, user.id)
    return apiSuccess(billingPlanDetailSchema.parse(result), 201)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError('JSON inválido', 400)
    }

    if (error instanceof BillingPlanMutationError) {
      return apiError(error.message, error.status)
    }

    logger.error({ err: error }, '[system/billing-plans] Error')
    return apiError('Failed to create billing plan', 500, error)
  }
}
