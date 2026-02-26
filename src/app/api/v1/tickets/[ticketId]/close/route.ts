import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { revalidateTag } from 'next/cache'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { closeTicketSchema } from '@/schemas/ticket-schemas'
import { closeTicket } from '@/services/tickets/ticket.service'

// POST /api/v1/tickets/:id/close - Close ticket (won/lost)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const organizationId = access.organizationId
  const { ticketId } = await params

  try {
    const body = await req.json()
    const parsed = closeTicketSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const result = await closeTicket({
      organizationId,
      ticketId,
      reason: parsed.data.reason,
      closedReason: parsed.data.closedReason,
      dealValue: parsed.data.dealValue,
    })

    if ('error' in result) {
      return NextResponse.json(
        {
          error: result.error,
          ...('currentStatus' in result ? { currentStatus: result.currentStatus } : {}),
        },
        { status: result.status }
      )
    }

    // Revalidate cache
    await revalidateTag(`org-${organizationId}`, 'max')

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('[api/tickets/[ticketId]/close] POST error:', error)
    return apiError('Falha ao fechar ticket', 500, error)
  }
}
