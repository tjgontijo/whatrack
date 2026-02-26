import { NextRequest, NextResponse } from 'next/server'

import { aiInsightsQuerySchema } from '@/schemas/ai/ai-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { listAiInsights } from '@/services/ai/ai-insight-query.service'

export async function GET(request: NextRequest) {
  try {
    const access = await validatePermissionAccess(request, 'view:ai')
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: access.error || 'Unauthorized' }, { status: 401 })
    }

    const parsed = aiInsightsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const insights = await listAiInsights(access.organizationId, parsed.data.status)
    return NextResponse.json({ items: insights })
  } catch (error) {
    console.error('[GET ai-insights] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
