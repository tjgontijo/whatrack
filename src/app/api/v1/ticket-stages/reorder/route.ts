import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { reorderTicketStageSchema } from '@/schemas/tickets/ticket-stage-schemas'
import { reorderTicketStages } from '@/services/ticket-stages/ticket-stage.service'

export async function PUT(req: Request) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const body = await req.json()
    const parsed = reorderTicketStageSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await reorderTicketStages({
      organizationId: access.organizationId,
      orderedIds: parsed.data.orderedIds,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[ticket-stages/reorder] PUT error:', error)
    return apiError('Falha ao reordenar fases', 500, error)
  }
}
