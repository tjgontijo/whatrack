import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { revalidateTag } from 'next/cache'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { closeTicketSchema } from '@/schemas/tickets/ticket-schemas'
import { closeTicket } from '@/services/tickets/ticket.service'
import { logger } from '@/lib/utils/logger'

// POST /api/v1/tickets/:id/close - Close ticket (won/lost)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const organizationId = access.organizationId
  const { ticketId } = await params

  try {
    const body = await req.json()
    const parsed = closeTicketSchema.safeParse(body)

    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await closeTicket({
      organizationId,
      ticketId,
      reason: parsed.data.reason,
      closedReason: parsed.data.closedReason,
      dealValue: parsed.data.dealValue,
    })

    if ('error' in result) {
      return apiError(
        result.error,
        result.status,
        undefined,
        'currentStatus' in result ? { currentStatus: result.currentStatus } : undefined
      )
    }

    // Revalidate cache
    await revalidateTag(`org-${organizationId}`, 'max')

    return NextResponse.json(result.data)
  } catch (error) {
    logger.error({ err: error }, '[api/tickets/[ticketId]/close] POST error')
    return apiError('Falha ao fechar ticket', 500, error)
  }
}
