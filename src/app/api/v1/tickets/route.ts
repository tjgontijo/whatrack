import { NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { revalidateTag } from 'next/cache'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { isDateRangePreset, resolveDateRange } from '@/lib/date/date-range'
import { ticketsQuerySchema, createTicketSchema } from '@/schemas/tickets/ticket-schemas'
import { listTickets, createTicket } from '@/services/tickets/ticket.service'
import { logger } from '@/lib/utils/logger'

export async function GET(req: Request) {
  const access = await validatePermissionAccess(req, 'view:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  const { searchParams } = new URL(req.url)
  const parsed = ticketsQuerySchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    stageId: searchParams.get('stageId') ?? undefined,
    assigneeId: searchParams.get('assigneeId') ?? undefined,
    sourceType: searchParams.get('sourceType') ?? undefined,
    utmSource: searchParams.get('utmSource') ?? undefined,
    windowStatus: searchParams.get('windowStatus') ?? undefined,
    dateRange: searchParams.get('dateRange') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  })

  if (!parsed.success) {
    return apiError('Parâmetros inválidos', 400, undefined, { details: parsed.error.flatten() })
  }

  const {
    q,
    status,
    stageId,
    assigneeId,
    sourceType,
    utmSource,
    windowStatus,
    dateRange,
    page,
    pageSize,
  } = parsed.data

  try {
    const result = await listTickets({
      organizationId: access.organizationId,
      q,
      status,
      stageId,
      assigneeId,
      sourceType,
      utmSource,
      windowStatus: windowStatus as 'open' | 'expired' | undefined,
      dateRange: isDateRangePreset(dateRange) ? resolveDateRange(dateRange) : undefined,
      page,
      pageSize,
    })

    return NextResponse.json({ ...result, page, pageSize })
  } catch (error) {
    logger.error({ err: error }, '[api/tickets] GET error')
    return apiError('Failed to fetch tickets', 500, error)
  }
}

export async function POST(req: Request) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return apiError(access.error ?? 'Acesso negado', 403)
  }

  try {
    const body = await req.json()
    const parsed = createTicketSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Dados inválidos', 400, undefined, { details: parsed.error.flatten() })
    }

    const result = await createTicket({
      organizationId: access.organizationId,
      conversationId: parsed.data.conversationId,
      stageId: parsed.data.stageId,
      assigneeId: parsed.data.assigneeId,
      dealValue: parsed.data.dealValue,
      createdBy: access.userId || 'SYSTEM',
    })

    if ('error' in result) {
      return apiError(result.error, result.status, undefined, 'ticketId' in result ? { ticketId: result.ticketId } : undefined)
    }

    await revalidateTag(`org-${access.organizationId}`, 'max')
    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, '[api/tickets] POST error')
    return apiError('Falha ao criar ticket', 500, error)
  }
}
