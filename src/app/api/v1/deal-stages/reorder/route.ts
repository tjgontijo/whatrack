import { NextResponse } from 'next/server'
import { reorderDealStageSchema } from '@/features/deal-stages/schemas/deal-stage.schemas'
import { reorderDealStages } from '@/features/deal-stages/services/deal-stage.service'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'

export async function PUT(req: Request) {
  const access = await validatePermissionAccess(req, 'manage:deals')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const body = await req.json()
    const parsed = reorderDealStageSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await reorderDealStages({
      organizationId: access.organizationId,
      projectId:
        (await resolveProjectScope({
          organizationId: access.organizationId,
          projectId: parsed.data.projectId,
        })) ?? undefined,
      orderedIds: parsed.data.orderedIds,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ err: error }, '[deal-stages/reorder] PUT error')
    return apiError('Falha ao reordenar fases', 500, error)
  }
}
