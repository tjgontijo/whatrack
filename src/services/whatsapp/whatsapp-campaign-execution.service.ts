import { prisma } from '@/lib/db/prisma'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { resolveAccessToken } from '@/lib/whatsapp/token-crypto'
import { logger } from '@/lib/utils/logger'
import { WhatsAppChatService } from '@/services/whatsapp/whatsapp-chat.service'

const BATCH_SIZE = 10 // 10 mensagens por segundo
const BATCH_DELAY_MS = 1000 // 1 segundo entre lotes

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Orquestrador principal — substitui o Inngest.
 * Chamado via after() nas rotas de dispatch e retry-failed.
 */
export async function runCampaignDispatch(campaignId: string, organizationId: string) {
  logger.info({ campaignId }, '[Campaign] runCampaignDispatch started')

  await prisma.whatsAppCampaign.update({
    where: { id: campaignId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  })

  const groups = await prisma.whatsAppCampaignDispatchGroup.findMany({
    where: { campaignId, status: { in: ['PENDING', 'PROCESSING'] } },
    select: { id: true },
  })

  logger.info({ campaignId, groupCount: groups.length }, '[Campaign] Groups to process')

  for (const group of groups) {
    await processDispatchGroup(group.id, organizationId)
  }

  await checkAndCompleteCampaign(campaignId)
  logger.info({ campaignId }, '[Campaign] runCampaignDispatch finished')
}


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
      campaign: {
        select: {
          id: true,
          name: true,
          projectId: true,
          type: true,
          organizationId: true,
          templateName: true,
          templateLang: true,
          shouldCreateLeads: true,
        },
      },
      config: { select: { id: true, phoneId: true, accessToken: true, displayPhone: true } },
      recipients: {
        where: { status: 'PENDING' },
        select: { id: true, phone: true, variables: true, metaWamid: true },
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
  let rateLimitHit = false

  const token = resolveAccessToken(group.config.accessToken || '')

  for (let i = 0; i < group.recipients.length; i += BATCH_SIZE) {
    if (rateLimitHit) break

    const batch = group.recipients.slice(i, i + BATCH_SIZE)

    // Delay entre lotes (exceto o primeiro)
    if (i > 0) {
      await sleep(BATCH_DELAY_MS)
    }

    const results = await Promise.allSettled(
      batch.map(async (recipient) => {
        // Se já tem WAMID, significa que foi enviado na tentativa anterior mas o status não foi atualizado
        if (recipient.metaWamid) {
          await prisma.whatsAppCampaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          })
          return { messages: [{ id: recipient.metaWamid }] }
        }

        const phone = formatPhoneForMeta(recipient.phone)
        const variables = resolveTemplateVariables(recipient.variables)

        const result = await MetaCloudService.sendTemplate({
          phoneId: group.config.phoneId!,
          to: phone,
          templateName: group.campaign.templateName!,
          language: group.campaign.templateLang!,
          variables,
          accessToken: token || undefined,
        })

        const wamid = result.messages?.[0]?.id

        await prisma.whatsAppCampaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            metaWamid: wamid,
          },
        })

        // Record in chat history (Lead, Conversation, Message)
        if (wamid) {
          await WhatsAppChatService.recordCampaignMessage({
            instanceId: group.configId,
            organizationId: group.campaign.organizationId,
            projectId: group.campaign.projectId,
            phone: recipient.phone,
            campaignId: group.campaign.id,
            campaignName: group.campaign.name,
            wamid,
            body: `Template: ${group.campaign.templateName}`,
            variables,
            shouldCreateLeads: group.campaign.shouldCreateLeads,
          })
        }

        return result
      })
    )

    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      const recipient = batch[j]

      if (result.status === 'rejected') {
        const errorMsg = result.reason instanceof Error ? result.reason.message : 'Unknown error'
        
        // Verifica se é erro de Rate Limit (#130429)
        if (errorMsg.includes('130429') || errorMsg.toLowerCase().includes('rate limit')) {
          rateLimitHit = true
          // Se for rate limit, mantemos como PENDING para tentar depois (não incrementa failed)
          continue
        }

        failed++
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

  await syncDispatchGroupState(groupId)

  if (rateLimitHit) {
    logger.warn({ groupId }, '[WhatsAppCampaignExecution] Rate limit hit, pausing group')
  }

  logger.info(
    { groupId, campaignId: group.campaign.id, accepted: success, failed, rateLimitHit },
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
  // Remove all non-digits. User is responsible for providing the full DDI.
  return phone.replace(/\D/g, '')
}

async function syncDispatchGroupState(groupId: string): Promise<void> {
  const recipients = await prisma.whatsAppCampaignRecipient.findMany({
    where: { dispatchGroupId: groupId },
    select: { status: true, metaWamid: true },
  })

  const total = recipients.length
  const failed = recipients.filter((recipient) =>
    ['FAILED', 'EXCLUDED'].includes(recipient.status)
  ).length
  const success = recipients.filter((recipient) =>
    ['SENT', 'DELIVERED', 'READ', 'RESPONDED'].includes(recipient.status)
  ).length
  const awaitingWebhook = recipients.filter(
    (recipient) => recipient.status === 'PENDING' && typeof recipient.metaWamid === 'string'
  ).length

  let status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'PENDING'

  if (total > 0 && failed === total) {
    status = 'FAILED'
  } else if (total > 0 && success + failed === total) {
    status = 'COMPLETED'
  } else if (awaitingWebhook > 0 || success > 0 || failed > 0) {
    status = 'PROCESSING'
  }

  await prisma.whatsAppCampaignDispatchGroup.update({
    where: { id: groupId },
    data: {
      status,
      processedCount: success + failed,
      successCount: success,
      failCount: failed,
    },
  })
}
