import { prisma } from '@/lib/db/prisma'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { resolveAccessToken } from '@/lib/whatsapp/token-crypto'
import { logger } from '@/lib/utils/logger'

const BATCH_SIZE = 50

interface DispatchGroupResult {
  groupId: string
  success: number
  failed: number
  errors: Array<{ phone: string; error: string }>
}

type TemplateVariable = { name: string; value: string }

function resolveTemplateVariables(value: unknown): TemplateVariable[] {
  if (Array.isArray(value)) {
    return value as TemplateVariable[]
  }

  if (
    value &&
    typeof value === 'object' &&
    'body' in value &&
    Array.isArray((value as { body?: unknown }).body)
  ) {
    return (value as { body: TemplateVariable[] }).body
  }

  return []
}

export async function processDispatchGroup(
  groupId: string,
  organizationId: string
): Promise<DispatchGroupResult> {
  const group = await prisma.whatsAppCampaignDispatchGroup.findFirst({
    where: { id: groupId, campaign: { organizationId } },
    include: {
      campaign: { select: { id: true, type: true, organizationId: true } },
      config: { select: { id: true, phoneId: true, accessToken: true, displayPhone: true } },
      recipients: {
        where: { status: 'PENDING' },
        select: { id: true, phone: true, variables: true },
      },
    },
  })

  if (!group) {
    return { groupId, success: 0, failed: 0, errors: [] }
  }

  if (!group.config.phoneId) {
    return {
      groupId,
      success: 0,
      failed: group.recipients.length,
      errors: group.recipients.map((r) => ({ phone: r.phone, error: 'Config sem phoneId' })),
    }
  }

  await prisma.whatsAppCampaignDispatchGroup.update({
    where: { id: groupId },
    data: { status: 'PROCESSING' },
  })

  let success = 0
  let failed = 0
  const errors: Array<{ phone: string; error: string }> = []

  const token = resolveAccessToken(group.config.accessToken || '')

  for (let i = 0; i < group.recipients.length; i += BATCH_SIZE) {
    const batch = group.recipients.slice(i, i + BATCH_SIZE)

    const results = await Promise.allSettled(
      batch.map(async (recipient) => {
        const phone = formatPhoneForMeta(recipient.phone)
        const variables = resolveTemplateVariables(recipient.variables)

        const result = await MetaCloudService.sendTemplate({
          phoneId: group.config.phoneId!,
          to: phone,
          templateName: group.templateName,
          language: group.templateLang,
          variables,
          accessToken: token || undefined,
        })

        await prisma.whatsAppCampaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'SENT',
            metaWamid: result.messages?.[0]?.id,
            sentAt: new Date(),
          },
        })

        return result
      })
    )

    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      const recipient = batch[j]

      if (result.status === 'rejected') {
        failed++
        const errorMsg = result.reason instanceof Error ? result.reason.message : 'Unknown error'
        errors.push({ phone: recipient.phone, error: errorMsg })

        await prisma.whatsAppCampaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: errorMsg,
          },
        })
      } else {
        success++
      }
    }
  }

  const newStatus = failed === group.recipients.length ? 'FAILED' : 'COMPLETED'

  await prisma.whatsAppCampaignDispatchGroup.update({
    where: { id: groupId },
    data: {
      status: newStatus,
      processedCount: group.recipients.length,
      successCount: success,
      failCount: failed,
    },
  })

  logger.info(
    { groupId, campaignId: group.campaign.id, success, failed },
    '[WhatsAppCampaignExecution] Group processed'
  )

  return { groupId, success, failed, errors }
}

export async function checkAndCompleteCampaign(campaignId: string) {
  const pendingGroups = await prisma.whatsAppCampaignDispatchGroup.count({
    where: { campaignId, status: { in: ['PENDING', 'PROCESSING'] } },
  })

  if (pendingGroups > 0) return

  const campaign = await prisma.whatsAppCampaign.findUnique({
    where: { id: campaignId },
    select: { id: true },
  })

  if (!campaign) return

  await prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })

  logger.info({ campaignId }, '[WhatsAppCampaignExecution] Campaign completed')
}

function formatPhoneForMeta(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return digits
  }
  return digits
}
