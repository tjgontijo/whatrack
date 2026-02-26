import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { aiInsightsQuerySchema } from '@/schemas/ai/ai-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { listAiInsights } from '@/services/ai/ai-insight-query.service'

export async function GET(request: NextRequest) {
  try {
    const access = await validatePermissionAccess(request, 'view:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error || 'Unauthorized', 401)
    }

    const parsed = aiInsightsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) {
      return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const insights = await listAiInsights(access.organizationId, parsed.data.status)
    return NextResponse.json({ items: insights })
  } catch (error) {
    console.error('[GET ai-insights] Error:', error)
    return apiError('Internal server error', 500, error)
  }
}
