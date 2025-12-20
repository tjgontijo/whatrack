import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import {
  leadSalesResponseSchema,
  type LeadSaleTicketSummary,
  type LeadSaleService,
} from '@/schemas/lead-tickets'
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
    const organizationId = access.organizationId

    const leadRecord = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
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

    const salesRecords = await prisma.sale.findMany({
      where: {
        organizationId,
        ticket: {
          whatsappConversation: {
            leadId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
        ticket: {
          select: {
            id: true,
            closedAt: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            createdAt: true,
          },
        },
      },
    })

    let totalAmount = 0

    const sales = salesRecords.map((sale) => {
      const amountNumber = sale.totalAmount !== null ? Number(sale.totalAmount) : null
      if (amountNumber !== null) {
        totalAmount += amountNumber
      }

      const ticketSummary = sale.ticket ? buildTicketSummary(sale.ticket) : null
      const services: LeadSaleService[] = []

      return {
        id: sale.id,
        amount: amountNumber,
        serviceCount: null,
        fbtraceId: null,
        createdAt: sale.createdAt.toISOString(),
        updatedAt: sale.updatedAt.toISOString(),
        services,
        rawDescription: null,
        ticket: ticketSummary,
      }
    })

    const payload = leadSalesResponseSchema.parse({
      lead: {
        id: leadRecord.id,
        name: leadRecord.name,
        phone: leadRecord.phone,
        createdAt: leadRecord.createdAt.toISOString(),
      },
      totals: {
        sales: sales.length,
        totalAmount,
      },
      sales,
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error('[api/leads/[leadId]/sales] GET error:', error)
    return NextResponse.json({ error: 'Não foi possível carregar as vendas' }, { status: 500 })
  }
}

function buildTicketSummary(ticket: {
  id: string
  closedAt: Date | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  createdAt: Date
}): LeadSaleTicketSummary {
  return {
    id: ticket.id,
    pipefyId: null,
    pipefyUrl: null,
    status: ticket.closedAt ? 'closed' : 'open',
    utmSource: ticket.utmSource,
    utmMedium: ticket.utmMedium,
    utmCampaign: ticket.utmCampaign,
    createdAt: ticket.createdAt.toISOString(),
  }
}
