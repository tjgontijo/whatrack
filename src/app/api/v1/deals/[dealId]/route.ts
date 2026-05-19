import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import { updateDealSchema } from '@/features/deals/schemas/deal.schemas'
import { getDealById, updateDealAndTrackCapi } from '@/features/deals/services/deal.service'
import { apiError } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'

export async function GET(req: NextRequest, { params }: { params: Promise<{ dealId: string }> }) {
  const access = await validatePermissionAccess(req, 'view:deals')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { dealId } = await params

  try {
    const deal = await getDealById(dealId, access.organizationId)
    if (!deal) {
      return apiError('Deal não encontrado', 404)
    }
    return NextResponse.json(deal)
  } catch (error) {
    logger.error({ err: error }, '[api/deals/[dealId]] GET error')
    return apiError('Falha ao buscar deal', 500, error)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const access = await validatePermissionAccess(req, 'manage:deals')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { dealId } = await params

  try {
    const body = await req.json()
    const parsed = updateDealSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const projectId =
      typeof parsed.data.projectId !== 'undefined'
        ? await resolveProjectScope({
            organizationId: access.organizationId,
            projectId: parsed.data.projectId,
          })
        : undefined

    const result = await updateDealAndTrackCapi({
      organizationId: access.organizationId,
      dealId,
      projectId,
      stageId: parsed.data.stageId,
      assigneeId: parsed.data.assigneeId,
      dealValue: parsed.data.dealValue,
      position: parsed.data.position,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    await revalidateTag(`org-${access.organizationId}`, 'max')
    return NextResponse.json(result.data)
  } catch (error) {
    logger.error({ err: error }, '[api/deals/[dealId]] PATCH error')
    return apiError('Falha ao atualizar deal', 500, error)
  }
}
