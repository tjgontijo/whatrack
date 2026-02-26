import { NextRequest, NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { rejectAiInsight } from '@/services/ai/ai-insight-query.service'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.userId || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const insightId = (await params).id
    const result = await rejectAiInsight(access.organizationId, insightId)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('[Reject AI Insight] Error:', error)
    return NextResponse.json({ error: 'Erro interno ao descartar insight' }, { status: 500 })
  }
}
