import { prisma } from '@/lib/db/prisma'
import { inngest } from '@/server/inngest/client'
import {
  processDispatchGroup,
  checkAndCompleteCampaign,
} from '@/services/whatsapp/whatsapp-campaign-execution.service'
import { logger } from '@/lib/utils/logger'

export const whatsappCampaignDispatchFunction = inngest.createFunction(
  {
    id: 'whatsapp-campaign-dispatch',
    triggers: [{ event: 'whatsapp/campaign.dispatch' }],
    // Aumentando o timeout para dar tempo de processar campanhas grandes com delay
    concurrency: 5, 
  },
  async ({ event, step }) => {
    const { campaignId, organizationId, scheduledAt, immediate } = event.data

    // 1. Lidar com Agendamento
    if (!immediate && scheduledAt) {
      const scheduleDate = new Date(scheduledAt)
      if (scheduleDate.getTime() > Date.now()) {
        await step.sleepUntil('wait-for-scheduled-time', scheduleDate)
      }
    }

    // 2. Marcar campanha como em processamento
    await step.run('mark-campaign-processing', async () => {
      await prisma.whatsAppCampaign.update({
        where: { id: campaignId },
        data: { status: 'PROCESSING', startedAt: new Date() },
      })
    })

    // 3. Buscar grupos pendentes
    const groups = await step.run('fetch-groups', async () => {
      return prisma.whatsAppCampaignDispatchGroup.findMany({
        where: { campaignId, status: { in: ['PENDING', 'PROCESSING'] } },
        select: { id: true },
      })
    })

    if (groups.length === 0) {
      logger.info({ campaignId }, '[Inngest] No pending groups for campaign')
      return { success: true, groupsProcessed: 0 }
    }

    // 4. Processar cada grupo
    let processedCount = 0
    for (const group of groups) {
      await step.run(`process-group-${group.id}`, async () => {
        await processDispatchGroup(group.id, organizationId)
      })
      processedCount++
    }

    // 5. Finalizar campanha (verificar se todos os grupos concluíram)
    await step.run('complete-campaign', async () => {
      await checkAndCompleteCampaign(campaignId)
    })

    return {
      success: true,
      campaignId,
      groupsProcessed: processedCount,
    }
  }
)
