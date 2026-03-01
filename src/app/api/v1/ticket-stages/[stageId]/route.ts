import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/utils/api-response'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { updateTicketStageSchema } from '@/schemas/tickets/ticket-stage-schemas'
import { deleteTicketStage, updateTicketStage } from '@/services/ticket-stages/ticket-stage.service'
import { logger } from '@/lib/utils/logger'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ stageId: string }> }) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const body = await req.json()
    const parsed = updateTicketStageSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const { stageId } = await params
    const result = await updateTicketStage({
      organizationId: access.organizationId,
      stageId,
      name: parsed.data.name,
      color: parsed.data.color,
      isDefault: parsed.data.isDefault,
      isClosed: parsed.data.isClosed,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ err: error }, '[ticket-stages/[stageId]] PUT error')
    return apiError('Falha ao atualizar fase', 500, error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const { stageId } = await params
    const result = await deleteTicketStage({
      organizationId: access.organizationId,
      stageId,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error({ err: error }, '[ticket-stages/[stageId]] DELETE error')
    return apiError('Falha ao excluir fase', 500, error)
  }
}
