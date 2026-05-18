import type { NextRequest } from 'next/server'
import {
  billingPlanPublicQuerySchema,
  publicBillingPlanListResponseSchema,
} from '@/features/billing/schemas/billing-plan-schemas'
import { listPublicBillingPlans } from '@/features/billing/services/billing-plan-catalog.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'


export async function GET(request: NextRequest) {
  try {
    const parsed = billingPlanPublicQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams)
    )

    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, {
        details: parsed.error.flatten(),
      })
    }

    const items = await listPublicBillingPlans(parsed.data)
    return apiSuccess(publicBillingPlanListResponseSchema.parse({ items }))
  } catch (error) {
    logger.error({ err: error }, '[billing/plans] Error')
    return apiError('Failed to fetch public billing plans', 500, error)
  }
}
