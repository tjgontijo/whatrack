import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import type {
  WhatsAppCampaignCreateInput,
  WhatsAppCampaignUpdateInput,
} from '@/schemas/whatsapp/whatsapp-campaign-schemas'
import { Prisma } from '@/lib/db/client'

type CreateCampaignResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string; status: number }

type UpdateCampaignResult =
  | { success: true; data: unknown }
  | { success: false; error: string; status: number }

type SubmitForApprovalResult = { success: true } | { success: false; error: string; status: number }

type ApproveCampaignResult = { success: true } | { success: false; error: string; status: number }

type DispatchCampaignResult = { success: true } | { success: false; error: string; status: number }

type CancelCampaignResult = { success: true } | { success: false; error: string; status: number }

export async function createCampaign(
  organizationId: string,
  userId: string,
  input: WhatsAppCampaignCreateInput
): Promise<CreateCampaignResult> {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId },
    select: { id: true },
  })
  if (!project) {
    return { success: false, error: 'Projeto não encontrado', status: 404 }
  }

  if (input.dispatchGroups && input.dispatchGroups.length > 0) {
    const configIds = input.dispatchGroups.map((g) => g.configId)
    const configs = await prisma.whatsAppConfig.findMany({
      where: { id: { in: configIds }, organizationId, projectId: input.projectId },
      select: { id: true },
    })
    if (configs.length !== configIds.length) {
      return { success: false, error: 'Uma ou mais instâncias não foram encontradas', status: 400 }
    }
  }

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null

  const data: Prisma.WhatsAppCampaignUncheckedCreateInput = {
    organizationId,
    projectId: input.projectId,
    name: input.name,
    type: input.type,
    status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
    templateName: input.templateName,
    templateLang: input.templateLang,
    scheduledAt,
    createdById: userId,
    dispatchGroups: input.dispatchGroups
      ? {
          create: input.dispatchGroups.map((g, idx) => ({
            configId: g.configId,
            templateName: g.templateName,
            templateLang: g.templateLang,
            variables: (g.variables as Prisma.InputJsonValue) ?? null,
            order: g.order ?? idx,
          })),
        }
      : undefined,
  }

  const campaign = await prisma.whatsAppCampaign.create({ data })

  if (input.audience) {
    const dispatchGroups = await prisma.whatsAppCampaignDispatchGroup.findMany({
      where: { campaignId: campaign.id },
      select: { id: true },
      orderBy: { order: 'asc' },
    })

    if (dispatchGroups.length > 0) {
      const recipients = await buildRecipientsFromAudience(
        organizationId,
        input.projectId,
        campaign.id,
        input.audience,
        dispatchGroups.map((g) => g.id)
      )
      if (recipients.length > 0) {
        await prisma.whatsAppCampaignRecipient.createManyAndReturn({ data: recipients })
      }
    }
  }

  logger.info(
    { campaignId: campaign.id, organizationId, projectId: input.projectId, userId },
    '[WhatsAppCampaign] Campaign created'
  )

  return { success: true, data: { id: campaign.id } }
}

async function buildRecipientsFromAudience(
  organizationId: string,
  projectId: string,
  campaignId: string,
  audience: NonNullable<WhatsAppCampaignCreateInput['audience']>,
  dispatchGroupIds: string[]
): Promise<
  Array<{
    dispatchGroupId: string
    campaignId: string
    phone: string
    normalizedPhone: string
    leadId: string | null
    variables: object | undefined
    status: string
  }>
> {
  function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '')
  }

  const seenPhones = new Set<string>()
  const recipients: Array<{
    dispatchGroupId: string
    campaignId: string
    phone: string
    normalizedPhone: string
    leadId: string | null
    variables: object | undefined
    status: string
  }> = []

  if (audience.source === 'CRM' || audience.source === 'MIXED') {
    const leadFilters: Record<string, unknown> = {
      organizationId,
      isActive: audience.crmFilters?.isActive ?? true,
    }
    if (audience.crmFilters?.source) {
      leadFilters.source = audience.crmFilters.source
    }
    if (audience.crmFilters?.projectId) {
      leadFilters.projectId = audience.crmFilters.projectId
    }
    if (audience.crmFilters?.stageId) {
      leadFilters.conversations = {
        some: {
          tickets: {
            some: {
              stageId: audience.crmFilters.stageId,
            },
          },
        },
      }
    }

    const leads = await prisma.lead.findMany({
      where: leadFilters,
      select: { id: true, phone: true, waId: true },
    })

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i]
      const rawPhone = lead.waId || lead.phone || ''
      if (!rawPhone) continue

      const normalized = normalizePhone(rawPhone)
      if (seenPhones.has(normalized)) continue
      seenPhones.add(normalized)

      recipients.push({
        dispatchGroupId: dispatchGroupIds[i % dispatchGroupIds.length],
        campaignId,
        phone: rawPhone,
        normalizedPhone: normalized,
        leadId: lead.id,
        variables: undefined,
        status: 'PENDING',
      })
    }
  }

  if (audience.source === 'IMPORT' || audience.source === 'MIXED') {
    const withVars = audience.importedVariables || []
    const phoneMap = new Map<string, Array<{ name: string; value: string }>>()
    for (const item of withVars) {
      phoneMap.set(item.phone, item.variables || [])
    }

    const allPhones = new Set([...(audience.importedPhones || []), ...withVars.map((v) => v.phone)])

    let crmCount = recipients.length

    for (const phone of allPhones) {
      const normalized = normalizePhone(phone)
      if (seenPhones.has(normalized)) continue
      seenPhones.add(normalized)

      recipients.push({
        dispatchGroupId: dispatchGroupIds[crmCount % dispatchGroupIds.length],
        campaignId,
        phone,
        normalizedPhone: normalized,
        leadId: null,
        variables: phoneMap.get(phone) ? { body: phoneMap.get(phone) } : undefined,
        status: 'PENDING',
      })
      crmCount++
    }
  }

  return recipients
}

export async function updateCampaign(
  organizationId: string,
  campaignId: string,
  input: WhatsAppCampaignUpdateInput
): Promise<UpdateCampaignResult> {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { id: true, status: true },
  })

  if (!campaign) {
    return { success: false, error: 'Campanha não encontrada', status: 404 }
  }

  if (campaign.status !== 'DRAFT' && campaign.status !== 'PENDING_APPROVAL') {
    return { success: false, error: 'Campanha não pode ser editada no estado atual', status: 400 }
  }

  const data: Prisma.WhatsAppCampaignUpdateInput = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.templateName !== undefined ? { templateName: input.templateName } : {}),
    ...(input.templateLang !== undefined ? { templateLang: input.templateLang } : {}),
    ...(input.scheduledAt !== undefined
      ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null }
      : {}),
  }

  const updated = await prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data,
  })

  if (input.dispatchGroups !== undefined) {
    await prisma.whatsAppCampaignDispatchGroup.deleteMany({ where: { campaignId } })
    if (input.dispatchGroups.length > 0) {
      await prisma.whatsAppCampaignDispatchGroup.createMany({
        data: input.dispatchGroups.map((g, idx) => ({
          campaignId,
          configId: g.configId,
          templateName: g.templateName,
          templateLang: g.templateLang,
          variables: (g.variables as Prisma.InputJsonValue) ?? null,
          order: g.order ?? idx,
        })),
      })
    }
  }

  logger.info({ campaignId, organizationId }, '[WhatsAppCampaign] Campaign updated')

  return { success: true, data: updated }
}

export async function submitForApproval(
  organizationId: string,
  campaignId: string,
  userId: string
): Promise<SubmitForApprovalResult> {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { id: true, status: true },
  })

  if (!campaign) {
    return { success: false, error: 'Campanha não encontrada', status: 404 }
  }

  if (campaign.status !== 'DRAFT') {
    return {
      success: false,
      error: 'Apenas campanhas em rascunho podem ser submetidas para aprovação',
      status: 400,
    }
  }

  await prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: { status: 'PENDING_APPROVAL' },
  })

  await prisma.whatsAppCampaignApproval.create({
    data: { campaignId, userId, action: 'SUBMITTED' },
  })

  logger.info({ campaignId, userId }, '[WhatsAppCampaign] Submitted for approval')

  return { success: true }
}

export async function approveCampaign(
  organizationId: string,
  campaignId: string,
  userId: string,
  comment?: string
): Promise<ApproveCampaignResult> {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { id: true, status: true },
  })

  if (!campaign) {
    return { success: false, error: 'Campanha não encontrada', status: 404 }
  }

  if (campaign.status !== 'PENDING_APPROVAL') {
    return { success: false, error: 'Apenas campanhas pendentes podem ser aprovadas', status: 400 }
  }

  await prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'APPROVED',
      approvedById: userId,
      approvedAt: new Date(),
    },
  })

  await prisma.whatsAppCampaignApproval.create({
    data: { campaignId, userId, action: 'APPROVED', comment },
  })

  logger.info({ campaignId, userId }, '[WhatsAppCampaign] Approved')

  return { success: true }
}

export async function dispatchCampaign(
  organizationId: string,
  campaignId: string,
  userId: string,
  immediate: boolean,
  scheduledAt?: Date
): Promise<DispatchCampaignResult> {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { id: true, status: true, approvedAt: true },
  })

  if (!campaign) {
    return { success: false, error: 'Campanha não encontrada', status: 404 }
  }

  if (!['DRAFT', 'APPROVED'].includes(campaign.status)) {
    return {
      success: false,
      error: 'Campanha não pode ser disparada no estado atual',
      status: 400,
    }
  }

  if (immediate) {
    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    })
  } else {
    if (!scheduledAt) {
      return { success: false, error: 'Data de agendamento obrigatória', status: 400 }
    }
    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SCHEDULED',
        scheduledAt,
      },
    })
  }

  await prisma.whatsAppCampaignApproval.create({
    data: { campaignId, userId, action: immediate ? 'DISPATCHED' : 'SCHEDULED' },
  })

  logger.info({ campaignId, userId, immediate }, '[WhatsAppCampaign] Dispatched')

  return { success: true }
}

export async function cancelCampaign(
  organizationId: string,
  campaignId: string,
  userId: string,
  comment?: string
): Promise<CancelCampaignResult> {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { id: true, status: true },
  })

  if (!campaign) {
    return { success: false, error: 'Campanha não encontrada', status: 404 }
  }

  if (['COMPLETED', 'CANCELLED'].includes(campaign.status)) {
    return { success: false, error: 'Campanha já finalizada', status: 400 }
  }

  await prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledById: userId,
    },
  })

  await prisma.whatsAppCampaignDispatchGroup.updateMany({
    where: { campaignId, status: { in: ['PENDING', 'PROCESSING'] } },
    data: { status: 'CANCELLED' },
  })

  await prisma.whatsAppCampaignApproval.create({
    data: { campaignId, userId, action: 'CANCELLED', comment },
  })

  logger.info({ campaignId, userId }, '[WhatsAppCampaign] Cancelled')

  return { success: true }
}

export async function getCampaign(organizationId: string, campaignId: string) {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    include: {
      dispatchGroups: {
        include: { config: { select: { id: true, displayPhone: true, verifiedName: true } } },
        orderBy: { order: 'asc' },
      },
      approvals: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { whatsAppCampaignRecipients: true, imports: true } },
    },
  })

  if (!campaign) return null
  return campaign
}
