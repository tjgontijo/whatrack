import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { revalidateTag } from 'next/cache'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { resolveProjectScope } from '@/server/project/project-scope'
import { updateTicketSchema } from '@/schemas/tickets/ticket-schemas'
import { getTicketById, updateTicketAndTrackCapi } from '@/services/tickets/ticket.service'
import { logger } from '@/lib/utils/logger'

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const access = await validatePermissionAccess(req, 'view:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { ticketId } = await params

  try {
    const ticket = await getTicketById(ticketId, access.organizationId)
    if (!ticket) {
      return apiError('Ticket não encontrado', 404)
    }
    return NextResponse.json(ticket)
  } catch (error) {
    logger.error({ err: error }, '[api/tickets/[ticketId]] GET error')
    return apiError('Falha ao buscar ticket', 500, error)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { ticketId } = await params

  try {
    const body = await req.json()
    const parsed = updateTicketSchema.safeParse(body)
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

    const result = await updateTicketAndTrackCapi({
      organizationId: access.organizationId,
      ticketId,
      projectId,
      stageId: parsed.data.stageId,
      assigneeId: parsed.data.assigneeId,
      dealValue: parsed.data.dealValue,
    })

    if ('error' in result) {
      return apiError(result.error, result.status)
    }

    await revalidateTag(`org-${access.organizationId}`, 'max')
    return NextResponse.json(result.data)
  } catch (error) {
    logger.error({ err: error }, '[api/tickets/[ticketId]] PATCH error')
    return apiError('Falha ao atualizar ticket', 500, error)
  }
}
