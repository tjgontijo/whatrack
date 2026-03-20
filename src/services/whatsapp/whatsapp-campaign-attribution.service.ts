import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'

export async function attributeInboundMessageToCampaign(params: {
  phone: string
  organizationId: string
  messageId: string
  leadId: string
}): Promise<void> {
  try {
    const normalizedPhone = normalizePhone(params.phone)

    const recipient = await prisma.whatsAppCampaignRecipient.findFirst({
      where: {
        normalizedPhone,
        campaign: {
          organizationId: params.organizationId,
          status: { in: ['PROCESSING', 'COMPLETED'] },
        },
        status: { in: ['SENT', 'DELIVERED'] },
      },
      select: { id: true, campaignId: true },
    })

    if (!recipient) return

    await prisma.whatsAppCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'RESPONDED',
        respondedAt: new Date(),
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
}): Promise<void> {
  try {
    const recipient = await prisma.whatsAppCampaignRecipient.findFirst({
      where: { metaWamid: params.wamid },
      select: { id: true },
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

    const updateData: Record<string, unknown> = { status: recipientStatus }

    if (params.status === 'delivered') {
      updateData.deliveredAt = new Date()
    } else if (params.status === 'read') {
      updateData.readAt = new Date()
    } else if (params.status === 'failed') {
      updateData.failedAt = new Date()
    }

    await prisma.whatsAppCampaignRecipient.update({
      where: { id: recipient.id },
      data: updateData,
    })

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
