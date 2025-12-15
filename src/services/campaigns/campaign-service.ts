import {
  CampaignStatus,
  MessageStatus,
  Prisma,
  TemplateCategory,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendMetaCloudTemplate } from '@/services/whatsapp/meta-cloud'
import { getPricePerMessageCents } from './config'
import {
  type CreateCampaignParams,
  type UpdateCampaignParams,
  type ListCampaignsParams,
  type ListRecipientsParams,
} from './types'
import { debitCredits } from './credits-service'
import { processCampaign } from './campaign-processor'

type SendTemplateComponent = {
  type: 'header' | 'body' | 'button'
  parameters: Array<{
    type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video'
    text?: string
    image?: { link: string }
    document?: { link: string; filename?: string }
    video?: { link: string }
  }>
}

export async function listCampaigns(params: ListCampaignsParams) {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))

  const where: Prisma.CampaignWhereInput = {
    organizationId: params.organizationId,
    ...(params.status ? { status: params.status } : {}),
    ...(params.templateId ? { templateId: params.templateId } : {}),
  }

  if (params.dateFrom || params.dateTo) {
    where.createdAt = {}
    if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom)
    if (params.dateTo) where.createdAt.lte = new Date(params.dateTo)
  }

  const [items, total] = await prisma.$transaction([
    prisma.campaign.findMany({
      where,
      include: {
        template: {
          select: { id: true, name: true, category: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.campaign.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function getCampaignById(params: {
  organizationId: string
  campaignId: string
}) {
  return prisma.campaign.findFirst({
    where: {
      id: params.campaignId,
      organizationId: params.organizationId,
    },
    include: {
      template: true,
    },
  })
}

export async function createCampaign(params: CreateCampaignParams) {
  if (!params.recipients?.length) {
    throw new Error('At least one recipient is required')
  }

  const template = await prisma.whatsAppTemplate.findFirst({
    where: {
      id: params.templateId,
      organizationId: params.organizationId,
    },
  })

  if (!template) {
    throw new Error('Template not found')
  }

  const pricePerMessage = getPricePerMessageCents(
    template.category as TemplateCategory
  )
  const estimatedCost = pricePerMessage * params.recipients.length

  const scheduledAt = params.scheduledAt
    ? new Date(params.scheduledAt)
    : null

  const campaign = await prisma.campaign.create({
    data: {
      organizationId: params.organizationId,
      templateId: params.templateId,
      name: params.name,
      status: CampaignStatus.DRAFT,
      scheduledAt,
      totalRecipients: params.recipients.length,
      estimatedCost,
      recipients: {
        create: params.recipients.map((recipient) => ({
          phone: recipient.phone,
          variables: recipient.variables
            ? (recipient.variables as Prisma.InputJsonValue)
            : undefined,
        })),
      },
    },
    include: { template: true },
  })

  return campaign
}

export async function updateCampaign(params: UpdateCampaignParams) {
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: params.campaignId,
      organizationId: params.organizationId,
    },
  })

  if (!campaign) {
    throw new Error('Campaign not found')
  }

  if (campaign.status !== CampaignStatus.DRAFT) {
    throw new Error('Only draft campaigns can be updated')
  }

  return prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      name: params.name ?? campaign.name,
      scheduledAt: params.scheduledAt
        ? new Date(params.scheduledAt)
        : campaign.scheduledAt,
    },
  })
}

export async function startCampaign(params: {
  organizationId: string
  campaignId: string
}) {
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: params.campaignId,
      organizationId: params.organizationId,
    },
    include: { template: true },
  })

  if (!campaign) {
    throw new Error('Campaign not found')
  }

  if (
    campaign.status !== CampaignStatus.DRAFT &&
    campaign.status !== CampaignStatus.SCHEDULED
  ) {
    throw new Error('Campaign cannot be started')
  }

  // Debit credits before sending
  await debitCredits({
    organizationId: params.organizationId,
    amountCents: campaign.estimatedCost,
    campaignId: campaign.id,
  })

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: CampaignStatus.PROCESSING,
      startedAt: new Date(),
    },
  })

  // Fire and forget processing
  void processCampaign(campaign.id)

  return updated
}

export async function cancelCampaign(params: {
  organizationId: string
  campaignId: string
}) {
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: params.campaignId,
      organizationId: params.organizationId,
    },
  })

  if (!campaign) {
    throw new Error('Campaign not found')
  }

  if (
    campaign.status === CampaignStatus.COMPLETED ||
    campaign.status === CampaignStatus.CANCELLED
  ) {
    throw new Error('Campaign is already finalized')
  }

  return prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: CampaignStatus.CANCELLED },
  })
}

export async function listRecipients(params: ListRecipientsParams) {
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: params.campaignId,
      organizationId: params.organizationId,
    },
  })

  if (!campaign) {
    throw new Error('Campaign not found')
  }

  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50))

  const where: Prisma.CampaignRecipientWhereInput = {
    campaignId: params.campaignId,
    ...(params.status ? { status: params.status } : {}),
  }

  const [items, total] = await prisma.$transaction([
    prisma.campaignRecipient.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.campaignRecipient.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function exportRecipientsCsv(params: {
  organizationId: string
  campaignId: string
}) {
  const { items } = await listRecipients({
    ...params,
    page: 1,
    pageSize: 10_000,
  })

  const header = [
    'phone',
    'status',
    'messageId',
    'sentAt',
    'deliveredAt',
    'readAt',
    'failedAt',
    'errorCode',
    'errorMessage',
  ]

  const rows = items.map((r) =>
    [
      r.phone,
      r.status,
      r.messageId ?? '',
      r.sentAt ? r.sentAt.toISOString() : '',
      r.deliveredAt ? r.deliveredAt.toISOString() : '',
      r.readAt ? r.readAt.toISOString() : '',
      r.failedAt ? r.failedAt.toISOString() : '',
      r.errorCode ?? '',
      r.errorMessage ?? '',
    ].join(',')
  )

  return [header.join(','), ...rows].join('\n')
}

export async function sendSingleTemplate(params: {
  organizationId: string
  to: string
  templateId: string
  variables?: Record<string, unknown>
}) {
  const template = await prisma.whatsAppTemplate.findFirst({
    where: {
      id: params.templateId,
      organizationId: params.organizationId,
    },
  })

  if (!template) {
    throw new Error('Template not found')
  }

  const components = buildComponents(template.components, params.variables)

  return sendMetaCloudTemplate({
    organizationId: params.organizationId,
    to: params.to,
    templateName: template.name,
    languageCode: template.language,
    components,
  })
}

export function buildComponents(
  templateComponents: unknown,
  variables?: Record<string, unknown>
) {
  if (!variables || Object.keys(variables).length === 0) {
    return templateComponents as SendTemplateComponent[]
  }

  const params = Object.values(variables).map((value) => ({
    type: 'text',
    text: String(value),
  }))

  return [
    {
      type: 'body',
      parameters: params,
    } as SendTemplateComponent,
  ]
}
