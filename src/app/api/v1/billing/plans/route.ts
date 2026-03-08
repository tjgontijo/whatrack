import { NextRequest } from 'next/server'

import { apiError, apiSuccess } from '@/lib/utils/api-response'
import {
  billingPlanPublicQuerySchema,
  publicBillingPlanListResponseSchema,
} from '@/schemas/billing/billing-plan-schemas'
import { listPublicBillingPlans } from '@/services/billing/billing-plan-catalog.service'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const parsed = billingPlanPublicQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
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
