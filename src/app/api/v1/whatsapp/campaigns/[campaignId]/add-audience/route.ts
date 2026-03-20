import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db/prisma'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

const addAudienceSchema = z.object({
  crmFilters: z
    .object({
      source: z.string().optional(),
      isActive: z.boolean().optional(),
      projectId: z.string().uuid().optional(),
      stageId: z.string().uuid().optional(),
    })
    .optional(),
})

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if (digits.length === 12 && digits.startsWith('55')) return digits
  return digits
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return apiError('Unauthorized', 401)
  }

  const { campaignId } = await params
  const parsed = addAudienceSchema.safeParse(await request.json())
  if (!parsed.success) {
    return apiError('Payload inválido', 400, undefined, { details: parsed.error.flatten() })
  }

  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId: access.organizationId },
    include: {
      dispatchGroups: {
        where: { status: 'PENDING' },
        select: { id: true },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!campaign) {
    return apiError('Campanha não encontrada', 404)
  }

  if (campaign.status !== 'DRAFT' && campaign.status !== 'PENDING_APPROVAL') {
    return apiError('Campanha não aceita mais audiência', 400)
  }

  const dispatchGroups = campaign.dispatchGroups
  if (dispatchGroups.length === 0) {
    return apiError('Nenhum grupo de envio definido na campanha', 400)
  }

  const leadFilters: Record<string, unknown> = {
    organizationId: access.organizationId,
  }

  if (parsed.data.crmFilters?.source) {
    leadFilters.source = parsed.data.crmFilters.source
  }
  if (parsed.data.crmFilters?.isActive !== undefined) {
    leadFilters.isActive = parsed.data.crmFilters.isActive
  }
  if (parsed.data.crmFilters?.projectId) {
    leadFilters.projectId = parsed.data.crmFilters.projectId
  }
  if (parsed.data.crmFilters?.stageId) {
    leadFilters.conversations = {
      some: {
        tickets: {
          some: {
            stageId: parsed.data.crmFilters.stageId,
          },
        },
      },
    }
  }

  const leads = await prisma.lead.findMany({
    where: leadFilters,
    select: { id: true, phone: true, waId: true },
  })

  const seenPhones = new Set<string>()
  const recipients: Array<{
    dispatchGroupId: string
    campaignId: string
    phone: string
    normalizedPhone: string
    leadId: string
    status: string
  }> = []
  let duplicatesRemoved = 0

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i]
    const rawPhone = lead.waId || lead.phone || ''
    if (!rawPhone) continue

    const normalized = normalizePhone(rawPhone)
    if (seenPhones.has(normalized)) {
      duplicatesRemoved++
      continue
    }
    seenPhones.add(normalized)

    const groupIndex = i % dispatchGroups.length
    recipients.push({
      dispatchGroupId: dispatchGroups[groupIndex].id,
      campaignId: campaign.id,
      phone: rawPhone,
      normalizedPhone: normalized,
      leadId: lead.id,
      status: 'PENDING',
    })
  }

  if (recipients.length > 0) {
    await prisma.whatsAppCampaignRecipient.createManyAndReturn({ data: recipients })
  }

  logger.info(
    { campaignId, leads: recipients.length, duplicatesRemoved },
    '[WhatsAppCampaign] CRM audience added'
  )

  return apiSuccess({
    added: recipients.length,
    duplicatesRemoved,
  })
}
