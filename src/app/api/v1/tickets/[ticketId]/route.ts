import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { revalidateTag } from 'next/cache'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { updateTicketSchema } from '@/schemas/ticket-schemas'
import { getTicketById, updateTicketAndTrackCapi } from '@/services/tickets/ticket.service'

export async function GET(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const access = await validatePermissionAccess(req, 'view:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const { ticketId } = await params

  try {
    const ticket = await getTicketById(ticketId, access.organizationId)
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })
    }
    return NextResponse.json(ticket)
  } catch (error) {
    console.error('[api/tickets/[ticketId]] GET error:', error)
    return apiError('Falha ao buscar ticket', 500, error)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const { ticketId } = await params

  try {
    const body = await req.json()
    const parsed = updateTicketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await updateTicketAndTrackCapi({
      organizationId: access.organizationId,
      ticketId,
      stageId: parsed.data.stageId,
      assigneeId: parsed.data.assigneeId,
      dealValue: parsed.data.dealValue,
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    await revalidateTag(`org-${access.organizationId}`, 'max')
    return NextResponse.json(result.data)
  } catch (error) {
    console.error('[api/tickets/[ticketId]] PATCH error:', error)
    return apiError('Falha ao atualizar ticket', 500, error)
  }
}
