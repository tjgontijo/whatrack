import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { rejectAiInsight } from '@/services/ai/ai-insight-query.service'
import { logger } from '@/lib/utils/logger'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.userId || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const insightId = (await params).id
    const result = await rejectAiInsight(access.organizationId, insightId)

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result.data)
  } catch (error) {
    logger.error({ err: error }, '[Reject AI Insight] Error')
    return apiError('Erro interno ao descartar insight', 500, error)
  }
}
