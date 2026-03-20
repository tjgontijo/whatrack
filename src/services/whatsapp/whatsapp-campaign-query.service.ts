import { prisma } from '@/lib/db/prisma'
import type { WhatsAppCampaignListQuery } from '@/schemas/whatsapp/whatsapp-campaign-schemas'

export interface CampaignListItem {
  id: string
  name: string
  type: string
  status: string
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  templateName: string | null
  projectId: string
  projectName: string | null
  createdAt: string
  createdByName: string | null
  approvedByName: string | null
  approvedAt: string | null
  totalRecipients: number
  totalDispatchGroups: number
}

export interface CampaignDetail extends CampaignListItem {
  dispatchGroups: Array<{
    id: string
    templateName: string
    templateLang: string
    status: string
    processedCount: number
    successCount: number
    failCount: number
    configDisplayPhone: string | null
    configVerifiedName: string | null
  }>
  approvals: Array<{
    id: string
    action: string
    comment: string | null
    createdAt: string
    userName: string | null
    userEmail: string | null
  }>
}

export interface RecipientListItem {
  id: string
  phone: string
  status: string
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  failedAt: string | null
  failureReason: string | null
  respondedAt: string | null
  exclusionReason: string | null
  metaWamid: string | null
  leadId: string | null
  dispatchGroupTemplateName: string | null
  dispatchGroupStatus: string | null
}

export interface CampaignCounters {
  total: number
  draft: number
  pendingApproval: number
  scheduled: number
  processing: number
  completed: number
  cancelled: number
}

export async function listCampaigns(organizationId: string, query: WhatsAppCampaignListQuery) {
  const where = {
    organizationId,
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.type ? { type: query.type } : {}),
  }

  const [campaigns, total] = await Promise.all([
    prisma.whatsAppCampaign.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        scheduledAt: true,
        startedAt: true,
        completedAt: true,
        templateName: true,
        projectId: true,
        createdAt: true,
        project: { select: { name: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        approvedAt: true,
        _count: {
          select: {
            whatsAppCampaignRecipients: true,
            dispatchGroups: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.whatsAppCampaign.count({ where }),
  ])

  const items: CampaignListItem[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
    scheduledAt: c.scheduledAt?.toISOString() || null,
    startedAt: c.startedAt?.toISOString() || null,
    completedAt: c.completedAt?.toISOString() || null,
    templateName: c.templateName,
    projectId: c.projectId,
    projectName: c.project?.name || null,
    createdAt: c.createdAt.toISOString(),
    createdByName: c.createdBy?.name || null,
    approvedByName: c.approvedBy?.name || null,
    approvedAt: c.approvedAt?.toISOString() || null,
    totalRecipients: c._count.whatsAppCampaignRecipients,
    totalDispatchGroups: c._count.dispatchGroups,
  }))

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(total / query.pageSize),
  }
}

export async function getCampaignCounters(organizationId: string): Promise<CampaignCounters> {
  const [total, draft, pendingApproval, scheduled, processing, completed, cancelled] =
    await Promise.all([
      prisma.whatsAppCampaign.count({ where: { organizationId } }),
      prisma.whatsAppCampaign.count({ where: { organizationId, status: 'DRAFT' } }),
      prisma.whatsAppCampaign.count({ where: { organizationId, status: 'PENDING_APPROVAL' } }),
      prisma.whatsAppCampaign.count({ where: { organizationId, status: 'SCHEDULED' } }),
      prisma.whatsAppCampaign.count({ where: { organizationId, status: 'PROCESSING' } }),
      prisma.whatsAppCampaign.count({ where: { organizationId, status: 'COMPLETED' } }),
      prisma.whatsAppCampaign.count({ where: { organizationId, status: 'CANCELLED' } }),
    ])

  return { total, draft, pendingApproval, scheduled, processing, completed, cancelled }
}

export async function getCampaignDetail(
  organizationId: string,
  campaignId: string
): Promise<CampaignDetail | null> {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    include: {
      project: { select: { name: true } },
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      dispatchGroups: {
        include: {
          config: { select: { displayPhone: true, verifiedName: true } },
        },
        orderBy: { order: 'asc' },
      },
      approvals: {
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: {
          whatsAppCampaignRecipients: true,
          dispatchGroups: true,
        },
      },
    },
  })

  if (!campaign) return null

  return {
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    status: campaign.status,
    scheduledAt: campaign.scheduledAt?.toISOString() || null,
    startedAt: campaign.startedAt?.toISOString() || null,
    completedAt: campaign.completedAt?.toISOString() || null,
    templateName: campaign.templateName,
    projectId: campaign.projectId,
    projectName: campaign.project?.name || null,
    createdAt: campaign.createdAt.toISOString(),
    createdByName: campaign.createdBy?.name || null,
    approvedByName: campaign.approvedBy?.name || null,
    approvedAt: campaign.approvedAt?.toISOString() || null,
    totalRecipients: campaign._count.whatsAppCampaignRecipients,
    totalDispatchGroups: campaign._count.dispatchGroups,
    dispatchGroups: campaign.dispatchGroups.map((g) => ({
      id: g.id,
      templateName: g.templateName,
      templateLang: g.templateLang,
      status: g.status,
      processedCount: g.processedCount,
      successCount: g.successCount,
      failCount: g.failCount,
      configDisplayPhone: g.config.displayPhone || null,
      configVerifiedName: g.config.verifiedName || null,
    })),
    approvals: campaign.approvals.map((a) => ({
      id: a.id,
      action: a.action,
      comment: a.comment,
      createdAt: a.createdAt.toISOString(),
      userName: a.user?.name || null,
      userEmail: a.user?.email || null,
    })),
  }
}

export async function listRecipients(
  organizationId: string,
  campaignId: string,
  page: number,
  pageSize: number,
  status?: string
) {
  const campaign = await prisma.whatsAppCampaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { id: true },
  })

  if (!campaign) return null

  const where = {
    campaignId,
    ...(status ? { status } : {}),
  }

  const [recipients, total] = await Promise.all([
    prisma.whatsAppCampaignRecipient.findMany({
      where,
      include: {
        dispatchGroup: { select: { templateName: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.whatsAppCampaignRecipient.count({ where }),
  ])

  const items: RecipientListItem[] = recipients.map((r) => ({
    id: r.id,
    phone: r.phone,
    status: r.status,
    sentAt: r.sentAt?.toISOString() || null,
    deliveredAt: r.deliveredAt?.toISOString() || null,
    readAt: r.readAt?.toISOString() || null,
    failedAt: r.failedAt?.toISOString() || null,
    failureReason: r.failureReason,
    respondedAt: r.respondedAt?.toISOString() || null,
    exclusionReason: r.exclusionReason,
    metaWamid: r.metaWamid,
    leadId: r.leadId,
    dispatchGroupTemplateName: r.dispatchGroup?.templateName || null,
    dispatchGroupStatus: r.dispatchGroup?.status || null,
  }))

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
