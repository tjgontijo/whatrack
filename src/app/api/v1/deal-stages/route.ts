import { NextResponse } from 'next/server'
import { createDealStageSchema } from '@/features/deal-stages/schemas/deal-stage.schemas'
import {
  createDealStage,
  listDealStages,
} from '@/features/deal-stages/services/deal-stage.service'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import {
  validateFullAccess,
  validatePermissionAccess,
} from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'

export async function GET(req: Request) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const projectId = await resolveProjectScope({
      organizationId: access.organizationId,
      projectId: searchParams.get('projectId') ?? undefined,
    })

    return NextResponse.json(await listDealStages(access.organizationId, projectId ?? undefined))
  } catch (error) {
    logger.error({ err: error }, '[deal-stages] GET error')
    return apiError('Falha ao buscar fases', 500, error)
  }
}

export async function POST(req: Request) {
  const access = await validatePermissionAccess(req, 'manage:deals')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const body = await req.json()
    const parsed = createDealStageSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await createDealStage({
      organizationId: access.organizationId,
      projectId:
        (await resolveProjectScope({
          organizationId: access.organizationId,
          projectId: parsed.data.projectId,
        })) ?? undefined,
      name: parsed.data.name,
      color: parsed.data.color,
      order: parsed.data.order,
      statusGroup: parsed.data.statusGroup,
      probability: parsed.data.probability,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, '[deal-stages] POST error')
    return apiError('Falha ao criar fase', 500, error)
  }
}
