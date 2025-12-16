import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { leadTicketsResponseSchema } from '@/schemas/lead-tickets'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

const paramsSchema = z.object({
  leadId: z.string().uuid(),
})

export async function GET(req: Request, context: { params: Promise<{ leadId: string }> }) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const parseResult = paramsSchema.safeParse(await context.params)

    if (!parseResult.success) {
      return NextResponse.json({ error: 'leadId inválido' }, { status: 400 })
    }

    const { leadId } = parseResult.data
    const leadRecord = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: access.organizationId },
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    })

    if (!leadRecord) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    // Buscar tickets através da conversation
    const ticketRecords = await prisma.ticket.findMany({
      where: {
        conversation: {
          leadId,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        closedAt: true,
        gclid: true,
        fbclid: true,
        ctwaclid: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        utmTerm: true,
        utmContent: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const statusCounts = new Map<string | null, number>()
    const channelCounts = new Map<string, { source: string | null; medium: string | null; count: number }>()

    const tickets = ticketRecords.map((ticket) => {
      const status = ticket.closedAt ? 'closed' : 'open'
      const statusKey = status
      statusCounts.set(statusKey, (statusCounts.get(statusKey) ?? 0) + 1)

      const channelKey = `${ticket.utmSource ?? ''}|||${ticket.utmMedium ?? ''}`
      const existingChannel = channelCounts.get(channelKey) ?? {
        source: ticket.utmSource ?? null,
        medium: ticket.utmMedium ?? null,
        count: 0,
      }
      existingChannel.count += 1
      channelCounts.set(channelKey, existingChannel)

      return {
        id: ticket.id,
        status,
        pipefyId: null,
        gclid: ticket.gclid,
        fbclid: ticket.fbclid,
        ctwaclid: ticket.ctwaclid,
        utmSource: ticket.utmSource,
        utmMedium: ticket.utmMedium,
        utmCampaign: ticket.utmCampaign,
        utmTerm: ticket.utmTerm,
        utmContent: ticket.utmContent,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        pipefyUrl: null,
      }
    })

    const byStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }))
    const byChannel = Array.from(channelCounts.values())

    const payload = leadTicketsResponseSchema.parse({
      lead: {
        id: leadRecord.id,
        name: leadRecord.name,
        phone: leadRecord.phone,
        createdAt: leadRecord.createdAt.toISOString(),
      },
      totals: {
        tickets: tickets.length,
        byStatus,
        byChannel,
      },
      tickets,
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/leads/[leadId]/tickets] GET error:', error)
    return NextResponse.json({ error: 'Não foi possível carregar os tickets' }, { status: 500 })
  }
}
