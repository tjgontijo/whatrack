import { NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'
import { reorderTicketStageSchema } from '@/schemas/tickets/ticket-stage-schemas'
import { reorderTicketStages } from '@/services/ticket-stages/ticket-stage.service'
import { logger } from '@/lib/utils/logger'

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
      projectId: await resolveProjectScope({
        organizationId: access.organizationId,
        projectId: parsed.data.projectId,
      }) ?? undefined,
      orderedIds: parsed.data.orderedIds,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ err: error }, '[ticket-stages/reorder] PUT error')
    return apiError('Falha ao reordenar fases', 500, error)
  }
}
