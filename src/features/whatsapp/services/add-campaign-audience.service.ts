import "server-only"
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

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

export async function addCampaignAudienceService(
  campaignId: string,
  organizationId: string,
  input: unknown
) {
  const { crmFilters } = addAudienceSchema.parse(input)

  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    select: {
      id: true,
      status: true,
      dispatchGroups: {
        where: { status: 'PENDING' },
        select: { id: true },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!campaign) {
    throw Object.assign(new Error('Campanha não encontrada'), { status: 404 })
  }

  if (campaign.status !== 'DRAFT' && campaign.status !== 'PENDING_APPROVAL') {
    throw Object.assign(new Error('Campanha não aceita mais audiência'), { status: 400 })
  }

  if (campaign.dispatchGroups.length === 0) {
    throw Object.assign(new Error('Nenhum grupo de envio definido na campanha'), { status: 400 })
  }

  const leadFilters: Record<string, unknown> = { organizationId }

  if (crmFilters?.source) leadFilters.source = crmFilters.source
  if (crmFilters?.isActive !== undefined) leadFilters.isActive = crmFilters.isActive
  if (crmFilters?.projectId) leadFilters.projectId = crmFilters.projectId
  if (crmFilters?.stageId) {
    leadFilters.conversations = { some: { tickets: { some: { stageId: crmFilters.stageId } } } }
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
    if (seenPhones.has(normalized)) { duplicatesRemoved++; continue }
    seenPhones.add(normalized)

    recipients.push({
      dispatchGroupId: campaign.dispatchGroups[i % campaign.dispatchGroups.length].id,
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

  return { added: recipients.length, duplicatesRemoved }
}
