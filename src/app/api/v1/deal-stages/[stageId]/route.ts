import { type NextRequest, NextResponse } from 'next/server'
import { updateDealStageSchema } from '@/features/deal-stages/schemas/deal-stage.schemas'
import {
  deleteDealStage,
  updateDealStage,
} from '@/features/deal-stages/services/deal-stage.service'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ stageId: string }> }) {
  const access = await validatePermissionAccess(req, 'manage:deals')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const body = await req.json()
    const parsed = updateDealStageSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const { stageId } = await params
    const result = await updateDealStage({
      organizationId: access.organizationId,
      projectId:
        (await resolveProjectScope({
          organizationId: access.organizationId,
          projectId: parsed.data.projectId,
        })) ?? undefined,
      stageId,
      name: parsed.data.name,
      color: parsed.data.color,
      isDefault: parsed.data.isDefault,
      isClosed: parsed.data.isClosed,
      statusGroup: parsed.data.statusGroup,
      probability: parsed.data.probability,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ err: error }, '[deal-stages/[stageId]] PUT error')
    return apiError('Falha ao atualizar fase', 500, error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  const access = await validatePermissionAccess(req, 'manage:deals')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const { stageId } = await params
    const { searchParams } = new URL(req.url)
    const projectId = await resolveProjectScope({
      organizationId: access.organizationId,
      projectId: searchParams.get('projectId') ?? undefined,
    })

    const result = await deleteDealStage({
      organizationId: access.organizationId,
      projectId: projectId ?? undefined,
      stageId,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ err: error }, '[deal-stages/[stageId]] DELETE error')
    return apiError('Falha ao excluir fase', 500, error)
  }
}
