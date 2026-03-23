import 'server-only'

import { prisma } from '@/lib/db/prisma'
import { aiEventService } from '@/lib/ai/services/ai-event.service'
import { fail, ok, type Result } from '@/lib/shared/result'
import { logger } from '@/lib/utils/logger'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { WhatsAppTemplateAnalyticsService } from '@/services/whatsapp/whatsapp-template-analytics.service'

const DEFAULT_TEMPLATE_NAME = 'hello_world'
const DEFAULT_TEMPLATE_LANGUAGE = 'pt_BR'

export async function sendWhatsAppAiReply(input: {
  organizationId: string
  projectId: string
  leadId: string
  ticketId?: string | null
  conversationId: string
  to: string
  text: string
  windowOpen: boolean
  templateName?: string
  templateLanguage?: string
}) : Promise<
  Result<{
    channel: 'message' | 'template'
    wamid: string | null
    aiEventId: string | null
    providerResult: unknown
  }>
> {
  const config = await prisma.whatsAppConfig.findFirst({
    where: {
      organizationId: input.organizationId,
      projectId: input.projectId,
      status: {
        not: 'disconnected',
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    select: {
      id: true,
      phoneId: true,
      accessToken: true,
    },
  })

  if (!config?.phoneId) {
    return fail('WhatsApp config with phoneId not found for project')
  }

  try {
    const accessToken = MetaCloudService.getAccessTokenForConfig(config)

    if (input.windowOpen) {
      const providerResult = await MetaCloudService.sendText({
        phoneId: config.phoneId,
        to: input.to,
        text: input.text,
        accessToken,
      })

      const aiEvent = await aiEventService.record({
        type: 'MESSAGE_SENT',
        status: 'success',
        organizationId: input.organizationId,
        projectId: input.projectId,
        leadId: input.leadId,
        ticketId: input.ticketId ?? undefined,
        agentSlug: 'whatsapp-inbound',
        channel: 'whatsapp',
        direction: 'outbound',
        metadata: {
          conversationId: input.conversationId,
          wamid: providerResult?.messages?.[0]?.id ?? null,
          textPreview: input.text.slice(0, 300),
        },
      })

      return ok({
        channel: 'message',
        wamid: providerResult?.messages?.[0]?.id ?? null,
        aiEventId: aiEvent.success ? aiEvent.data.id : null,
        providerResult,
      })
    }

    const providerResult = await MetaCloudService.sendTemplate({
      phoneId: config.phoneId,
      to: input.to,
      templateName: input.templateName ?? DEFAULT_TEMPLATE_NAME,
      language: input.templateLanguage ?? DEFAULT_TEMPLATE_LANGUAGE,
      accessToken,
    })

    const wamid = providerResult?.messages?.[0]?.id ?? null
    if (wamid) {
      void WhatsAppTemplateAnalyticsService.logSend(
        wamid,
        input.templateName ?? DEFAULT_TEMPLATE_NAME,
        input.organizationId
      )
    }

    const aiEvent = await aiEventService.record({
      type: 'TEMPLATE_SENT',
      status: 'success',
      organizationId: input.organizationId,
      projectId: input.projectId,
      leadId: input.leadId,
      ticketId: input.ticketId ?? undefined,
      agentSlug: 'whatsapp-inbound',
      channel: 'whatsapp',
      direction: 'outbound',
      metadata: {
        conversationId: input.conversationId,
        wamid,
        templateName: input.templateName ?? DEFAULT_TEMPLATE_NAME,
        textPreview: input.text.slice(0, 300),
      },
    })

    return ok({
      channel: 'template',
      wamid,
      aiEventId: aiEvent.success ? aiEvent.data.id : null,
      providerResult,
    })
  } catch (error) {
    logger.error({ err: error, input }, '[whatsapp-ai-send] Failed to send AI reply')
    return fail(error instanceof Error ? error.message : 'Failed to send AI reply')
  }
}

export const whatsappAiSendService = {
  sendWhatsAppAiReply,
}
