import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { leadAuditResponseSchema, type LeadAuditResponse } from '@/lib/schema/lead-audit'
import { validateFullAccess } from '@/lib/auth/validate-organization-access'

const paramsSchema = z.object({
  leadId: z.string().uuid(),
})

export async function GET(req: Request, context: { params: Promise<{ leadId: string }> }) {
  const access = await validateFullAccess(req)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  try {
    const parsed = paramsSchema.safeParse(await context.params)

    if (!parsed.success) {
      return NextResponse.json({ error: 'leadId inválido' }, { status: 400 })
    }

    const { leadId } = parsed.data
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

    const audits = await prisma.salesAnalytics.findMany({
      where: { leadId, organizationId },
      orderBy: [{ createdAt: 'asc' }],
    })

    const payload: LeadAuditResponse = {
      lead: {
        id: leadRecord.id,
        name: leadRecord.name,
        phone: leadRecord.phone,
        createdAt: leadRecord.createdAt.toISOString(),
      },
      audits: audits.map((audit) => ({
        id: audit.id,
        lead_id: audit.leadId ?? '',
        qualy_audit: audit.qualyAudit,
        time_audit: audit.timeAudit,
        createdAt: audit.createdAt.toISOString(),
        updated_at: audit.updatedAt.toISOString(),
      })),
    }

    const validatedPayload = leadAuditResponseSchema.parse(payload)

    return NextResponse.json(validatedPayload)
  } catch (error) {
    console.error('[api/leads/[leadId]/audits] GET error:', error)
    return NextResponse.json({ error: 'Não foi possível carregar a auditoria' }, { status: 500 })
  }
}
