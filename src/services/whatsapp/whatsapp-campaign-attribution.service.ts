import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

export async function attributeInboundMessageToCampaign(params: {
  phone: string
  organizationId: string
  messageId: string
  leadId: string
  messageTimestamp: Date
}): Promise<void> {
  try {
    const normalizedPhone = normalizePhone(params.phone)

    const recipient = await prisma.whatsAppCampaignRecipient.findFirst({
      where: {
        normalizedPhone,
        metaWamid: { not: null },
        campaign: {
          organizationId: params.organizationId,
          status: { in: ['PROCESSING', 'COMPLETED'] },
        },
        status: { in: ['PENDING', 'SENT', 'DELIVERED', 'READ'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, campaignId: true },
    })

    if (!recipient) return

    await prisma.whatsAppCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'RESPONDED',
        respondedAt: params.messageTimestamp,
        leadId: params.leadId,
      },
    })

    await prisma.message.update({
      where: { id: params.messageId },
      data: { campaignRecipientId: recipient.id },
    })

    logger.info(
      { recipientId: recipient.id, campaignId: recipient.campaignId, messageId: params.messageId },
      '[CampaignAttribution] Inbound message attributed to campaign'
    )
  } catch (error) {
    logger.error(
      { err: error, phone: params.phone },
      '[CampaignAttribution] Error attributing inbound message'
    )
  }
}

export async function updateRecipientStatusFromWebhook(params: {
  wamid: string
  status: string
  eventTimestamp?: string | null
  failureReason?: string | null
}): Promise<void> {
  try {
    const recipient = await prisma.whatsAppCampaignRecipient.findFirst({
      where: { metaWamid: params.wamid },
      select: {
        id: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        failedAt: true,
        dispatchGroupId: true,
        campaignId: true,
      },
    })

    if (!recipient) return

    const statusMap: Record<string, string> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    }

    const recipientStatus = statusMap[params.status]
    if (!recipientStatus) return

    const eventDate = resolveMetaEventDate(params.eventTimestamp)

    const statusPriority: Record<string, number> = {
      PENDING: 0,
      SENT: 1,
      DELIVERED: 2,
      READ: 3,
      RESPONDED: 4,
      FAILED: -1,
      EXCLUDED: -2,
    }

    const currentPriority = statusPriority[recipient.status] ?? 0
    const nextPriority = statusPriority[recipientStatus] ?? 0

    const updateData: Record<string, unknown> = {}

    if (
      params.status === 'failed' ||
      (recipient.status !== 'RESPONDED' && nextPriority > currentPriority)
    ) {
      updateData.status = recipientStatus
    }

    if (!recipient.sentAt) {
      updateData.sentAt = eventDate
    }

    if (params.status === 'delivered' || params.status === 'read') {
      if (!recipient.deliveredAt) {
        updateData.deliveredAt = eventDate
      }
    }

    if (params.status === 'read') {
      if (!recipient.readAt) {
        updateData.readAt = eventDate
      }
    } else if (params.status === 'delivered') {
      if (!recipient.sentAt) {
        updateData.sentAt = eventDate
      }
    } else if (params.status === 'failed') {
      if (!recipient.failedAt) {
        updateData.failedAt = eventDate
      }
      updateData.failureReason = params.failureReason || 'Falha informada pelo webhook da Meta'
    }

    if (params.status === 'sent' && recipient.sentAt) {
      delete updateData.sentAt
    }

    if (Object.keys(updateData).length === 0) {
      return
    }

    await prisma.whatsAppCampaignRecipient.update({
      where: { id: recipient.id },
      data: updateData,
    })

    await syncDispatchGroupStatus(recipient.dispatchGroupId)
    await syncCampaignStatus(recipient.campaignId)

    logger.info(
      { recipientId: recipient.id, status: recipientStatus },
      '[CampaignAttribution] Recipient status updated from webhook'
    )
  } catch (error) {
    logger.error(
      { err: error, wamid: params.wamid },
      '[CampaignAttribution] Error updating recipient status'
    )
  }
}

async function syncDispatchGroupStatus(dispatchGroupId: string): Promise<void> {
  const recipients = await prisma.whatsAppCampaignRecipient.findMany({
    where: { dispatchGroupId },
    select: { status: true, metaWamid: true },
  })

  const counts = recipients.reduce<Record<string, number>>((acc, recipient) => {
    acc[recipient.status] = (acc[recipient.status] || 0) + 1
    return acc
  }, {})

  const total = recipients.length
  const failed = (counts.FAILED || 0) + (counts.EXCLUDED || 0)
  const success =
    (counts.SENT || 0) + (counts.DELIVERED || 0) + (counts.READ || 0) + (counts.RESPONDED || 0)
  const awaitingWebhook = recipients.filter(
    (recipient) => recipient.status === 'PENDING' && typeof recipient.metaWamid === 'string'
  ).length
  const processed = success + failed

  let status = 'PENDING'
  if (total > 0 && failed === total) {
    status = 'FAILED'
  } else if (total > 0 && processed === total) {
    status = 'COMPLETED'
  } else if (awaitingWebhook > 0 || processed > 0) {
    status = 'PROCESSING'
  }

  await prisma.whatsAppCampaignDispatchGroup.update({
    where: { id: dispatchGroupId },
    data: {
      status,
      processedCount: processed,
      successCount: success,
      failCount: failed,
    },
  })
}

async function syncCampaignStatus(campaignId: string): Promise<void> {
  const groups = await prisma.whatsAppCampaignDispatchGroup.findMany({
    where: { campaignId },
    select: { status: true },
  })

  if (groups.length === 0) return

  const hasPending = groups.some((group) => group.status === 'PENDING' || group.status === 'PROCESSING')
  const allFailed = groups.every((group) => group.status === 'FAILED')

  if (allFailed) {
    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    })
    return
  }

  if (!hasPending) {
    await prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return digits
  }
  return digits
}

function resolveMetaEventDate(value?: string | null): Date {
  const parsed = value ? Number(value) : NaN
  if (Number.isFinite(parsed) && parsed > 0) {
    return new Date(parsed * 1000)
  }
  return new Date()
}
