import { CampaignStatus, MessageStatus, TemplateCategory } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendMetaCloudTemplate } from '@/services/whatsapp/meta-cloud'
import { getPricePerMessageCents } from './config'
import { buildComponents } from './campaign-service'

const BATCH_SIZE = 50
const BATCH_DELAY_MS = 1000

export async function processCampaign(campaignId: string) {
  // Load campaign context
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      template: true,
      organization: {
        include: { metaWhatsAppCredential: true },
      },
    },
  })

  if (!campaign) return

  if (
    !campaign.organization.metaWhatsAppCredential ||
    !campaign.organization.metaWhatsAppCredential.isActive
  ) {
    await markFailed(campaignId, 'Meta credential not configured')
    return
  }

  if (campaign.status !== CampaignStatus.PROCESSING) {
    return
  }

  let hasFailures = false

  while (true) {
    const recipients = await prisma.campaignRecipient.findMany({
      where: {
        campaignId,
        status: MessageStatus.PENDING,
      },
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
    })

    if (recipients.length === 0) break

    await Promise.all(
      recipients.map(async (recipient) => {
        const components = buildComponents(
          campaign.template.components,
          recipient.variables as Record<string, unknown> | undefined
        )

        try {
          const result = await sendMetaCloudTemplate({
            organizationId: campaign.organizationId,
            to: recipient.phone,
            templateName: campaign.template.name,
            languageCode: campaign.template.language,
            components,
          })

          if (result.success) {
            await prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: MessageStatus.SENT,
                messageId: result.messageId,
                sentAt: new Date(),
              },
            })
          } else {
            hasFailures = true
            await prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: MessageStatus.FAILED,
                failedAt: new Date(),
                errorMessage: result.error ?? 'Unknown error',
              },
            })
          }
        } catch (error) {
          hasFailures = true
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: MessageStatus.FAILED,
              failedAt: new Date(),
              errorMessage:
                error instanceof Error ? error.message : 'Unknown error',
            },
          })
        }
      })
    )

    await updateCampaignMetrics(campaignId)
    await delay(BATCH_DELAY_MS)
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: hasFailures ? CampaignStatus.FAILED : CampaignStatus.COMPLETED,
      completedAt: new Date(),
      actualCost:
        campaign.actualCost && campaign.actualCost > 0
          ? campaign.actualCost
          : getPricePerMessageCents(
              campaign.template.category as TemplateCategory
            ) * campaign.totalRecipients,
    },
  })
}

async function markFailed(campaignId: string, message: string) {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: CampaignStatus.FAILED,
      completedAt: new Date(),
      failed: { increment: 1 },
    },
  })

  console.error(`[campaign-processor] Failed campaign ${campaignId}: ${message}`)
}

async function updateCampaignMetrics(campaignId: string) {
  const stats = await prisma.campaignRecipient.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: true,
  })

  const metrics: Record<MessageStatus, number> = {
    PENDING: 0,
    SENT: 0,
    DELIVERED: 0,
    READ: 0,
    FAILED: 0,
  }

  for (const row of stats) {
    metrics[row.status] = row._count
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      sent: metrics.SENT,
      delivered: metrics.DELIVERED,
      read: metrics.READ,
      failed: metrics.FAILED,
    },
  })
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
