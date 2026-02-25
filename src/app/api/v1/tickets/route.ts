import { NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { revalidateTag } from 'next/cache'

import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { ticketsQuerySchema, createTicketSchema } from '@/lib/validations/ticket-schemas'
import { listTickets, createTicket } from '@/services/tickets/ticket.service'

const DATE_RANGE_PRESETS = ['today', '7d', '30d', 'thisMonth'] as const
type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]

function isDateRangePreset(value: string | null | undefined): value is DateRangePreset {
  return Boolean(value && DATE_RANGE_PRESETS.includes(value as DateRangePreset))
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function resolveDateRange(preset: DateRangePreset): { gte: Date; lte: Date } {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  if (preset === 'today') return { gte: todayStart, lte: todayEnd }

  if (preset.endsWith('d')) {
    const days = Number.parseInt(preset.replace('d', ''), 10)
    const from = new Date(todayStart)
    from.setDate(from.getDate() - (days - 1))
    return { gte: from, lte: todayEnd }
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return { gte: monthStart, lte: todayEnd }
}

export async function GET(req: Request) {
  const access = await validatePermissionAccess(req, 'view:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
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
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
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
    console.error('[api/tickets] GET error:', error)
    return apiError('Failed to fetch tickets', 500, error)
  }
}

export async function POST(req: Request) {
  const access = await validatePermissionAccess(req, 'manage:tickets')
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = createTicketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: result.error, ...('ticketId' in result ? { ticketId: result.ticketId } : {}) },
        { status: result.status }
      )
    }

    await revalidateTag(`org-${access.organizationId}`, 'max')
    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('[api/tickets] POST error:', error)
    return apiError('Falha ao criar ticket', 500, error)
  }
}
