import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import {
  metaCopilotAnalyzeRequestSchema,
  type MetaCopilotAnalyzeRequestInput,
} from '@/schemas/meta-ads/meta-ads-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { runMetaCopilotAnalysis } from '@/services/meta-ads/meta-copilot-analysis.service'
import { logger } from '@/lib/utils/logger'

export async function POST(req: Request) {
  try {
    const access = await validatePermissionAccess(req, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return apiError(access.error ?? 'Unauthorized', 401)
    }

    const parsed = metaCopilotAnalyzeRequestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return apiError('Missing required fields', 400, undefined, { details: parsed.error.flatten() })
    }

    const payload: MetaCopilotAnalyzeRequestInput = parsed.data
    const scopedOrganizationId = payload.organizationId ?? access.organizationId

    if (scopedOrganizationId !== access.organizationId) {
      return apiError('Forbidden for requested organization', 403)
    }

    const result = await runMetaCopilotAnalysis({
      organizationId: access.organizationId,
      request: payload,
    })

    if ('error' in result) {
      return apiError(result.error, result.status, result.detail)
    }

    return NextResponse.json(result.data)
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error)
    logger.error({ err: detail }, '[Copilot] Analysis Error')
    if (error instanceof Error && error.stack) {
      logger.error({ err: error.stack }, '[Copilot] Stack')
    }

    return apiError('Internal server error analyzing campaign', 500, detail)
  }
}
