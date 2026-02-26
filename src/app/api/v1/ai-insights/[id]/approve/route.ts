import { NextRequest, NextResponse } from 'next/server'

import { approveAiInsightSchema } from '@/schemas/ai/ai-schemas'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { approveAiInsight } from '@/services/ai/ai-insight-approval.service'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await validatePermissionAccess(request, 'manage:ai')
    if (!access.hasAccess || !access.userId || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const insightId = (await params).id

    let payload = {}
    try {
      const raw = await request.json()
      const parsed = approveAiInsightSchema.safeParse(raw)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: parsed.error.flatten() },
          { status: 400 }
        )
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

      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('[Approve AI Conversion] Error:', error)
    return NextResponse.json({ error: 'Erro interno ao aprovar conversão' }, { status: 500 })
  }
}
