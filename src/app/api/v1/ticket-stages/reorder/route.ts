import { NextResponse } from 'next/server'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { reorderTicketStageSchema } from '@/schemas/ticket-stage-schemas'
import { reorderTicketStages } from '@/services/ticket-stages/ticket-stage.service'

export async function PUT(req: Request) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = reorderTicketStageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await reorderTicketStages({
      organizationId: access.organizationId,
      orderedIds: parsed.data.orderedIds,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ticket-stages/reorder] PUT error:', error)
    return NextResponse.json({ error: 'Falha ao reordenar fases' }, { status: 500 })
  }
}
