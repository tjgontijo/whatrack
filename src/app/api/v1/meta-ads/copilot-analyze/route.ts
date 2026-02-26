import { NextResponse } from 'next/server'

import {
  metaCopilotAnalyzeRequestSchema,
  type MetaCopilotAnalyzeRequestInput,
} from '@/schemas/meta-ads/meta-ads-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { runMetaCopilotAnalysis } from '@/services/meta-ads/meta-copilot-analysis.service'

export async function POST(req: Request) {
  try {
    const access = await validatePermissionAccess(req, 'manage:ai')
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: access.error ?? 'Unauthorized' }, { status: 401 })
    }

    const parsed = metaCopilotAnalyzeRequestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Missing required fields', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const payload: MetaCopilotAnalyzeRequestInput = parsed.data
    const scopedOrganizationId = payload.organizationId ?? access.organizationId

    if (scopedOrganizationId !== access.organizationId) {
      return NextResponse.json({ error: 'Forbidden for requested organization' }, { status: 403 })
    }

    const result = await runMetaCopilotAnalysis({
      organizationId: access.organizationId,
      request: payload,
    })

    if ('error' in result) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.detail ? { detail: result.detail } : {}),
        },
        { status: result.status }
      )
    }

    return NextResponse.json(result.data)
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('[Copilot] Analysis Error:', detail)
    if (error instanceof Error && error.stack) {
      console.error('[Copilot] Stack:', error.stack)
    }

    return NextResponse.json(
      {
        error: 'Internal server error analyzing campaign',
        detail: process.env.NODE_ENV === 'development' ? detail : undefined,
      },
      { status: 500 }
    )
  }
}
