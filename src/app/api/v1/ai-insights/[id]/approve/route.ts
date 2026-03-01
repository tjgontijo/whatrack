import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { approveAiInsightSchema } from '@/schemas/ai/ai-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { approveAiInsight } from '@/services/ai/ai-insight-approval.service'
import { logger } from '@/lib/utils/logger'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.userId || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const insightId = (await params).id

    let payload = {}
    try {
      const raw = await request.json()
      const parsed = approveAiInsightSchema.safeParse(raw)
      if (!parsed.success) {
        return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
      }

      payload = parsed.data
    } catch {
      payload = {}
    }

    const result = await approveAiInsight({
      organizationId: access.organizationId,
      insightId,
      input: payload,
    })

    if ('error' in result) {
      if (result.status === 422 && result.data) {
        return NextResponse.json(result.data, { status: 422 })
      }

      return apiError(result.error, result.status)
    }

    return NextResponse.json(result.data)
  } catch (error) {
    logger.error({ err: error }, '[Approve AI Conversion] Error')
    return apiError('Erro interno ao aprovar conversão', 500, error)
  }
}
