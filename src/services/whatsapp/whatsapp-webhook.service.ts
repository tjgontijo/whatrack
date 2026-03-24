import { prisma } from '@/lib/db/prisma'
import { verifyWebhookSignature } from '@/lib/whatsapp/webhook-signature'
import { whatsappWebhookVerifySchema } from '@/schemas/whatsapp/whatsapp-schemas'
import { WebhookProcessor } from '@/services/whatsapp/webhook-processor'
import { WhatsAppChatService } from '@/services/whatsapp/whatsapp-chat.service'

interface VerifyWebhookQueryInput {
  'hub.mode': string | null
  'hub.verify_token': string | null
  'hub.challenge': string | null
}

type WhatsAppWebhookPayload = {
  entry?: Array<{
    id?: string
    changes?: Array<{
      field?: string
      value?: {
        event?: string
        metadata?: {
          phone_number_id?: string
        }
        message_echoes?: unknown[]
        statuses?: unknown[]
      }
    }>
  }>
}

export function verifyWhatsAppWebhookQuery(input: VerifyWebhookQueryInput) {
  return whatsappWebhookVerifySchema.safeParse(input)
}

function detectWebhookEventType(payload: WhatsAppWebhookPayload): string | null {
  const changes = payload.entry?.[0]?.changes?.[0]

  if (changes?.field === 'account_update') {
    return payload.entry?.[0]?.changes?.[0]?.value?.event || 'account_update'
  }

  return changes?.field || null
}

export async function processWhatsAppWebhookPayload(rawBody: string, signatureHeader: string | null) {
  let webhookLogId: string | null = null

  try {
    const payload = JSON.parse(rawBody)
    const eventType = detectWebhookEventType(payload)

    const isValidSignature = verifyWebhookSignature(rawBody, signatureHeader)

    if (!isValidSignature) {
      try {
        const log = await prisma.whatsAppWebhookLog.create({
          data: {
            payload,
            eventType,
            processed: true,
            signatureValid: false,
            processingError: 'Invalid signature',
          },
        })
        webhookLogId = log.id
      } catch {
        webhookLogId = null
      }

      return { received: true, rejected: true, logId: webhookLogId }
    }

    try {
      const log = await prisma.whatsAppWebhookLog.create({
        data: {
          payload,
          eventType,
          processed: false,
          signatureValid: true,
        },
      })
      webhookLogId = log.id
    } catch {
      webhookLogId = null
    }

    const processor = new WebhookProcessor()
    try {
      await processor.process(payload)
    } catch (processorError) {
      if (webhookLogId) {
        await prisma.whatsAppWebhookLog
          .update({
            where: { id: webhookLogId },
            data: {
              processingError:
                processorError instanceof Error ? processorError.message : 'Unknown error',
            },
          })
          .catch(() => {})
      }
    }

    const changes = payload.entry?.[0]?.changes?.[0]
    const value = changes?.value
    const metadata = value?.metadata
    const phoneId = metadata?.phone_number_id
    const wabaId = payload.entry?.[0]?.id

    let instanceId: string | null = null
    let organizationId: string | null = null

    if (phoneId || wabaId) {
      const conditions: Array<{ phoneId: string } | { wabaId: string }> = []
      if (phoneId) conditions.push({ phoneId })
      if (wabaId) conditions.push({ wabaId })

      const config = await prisma.whatsAppConfig.findFirst({
        where: {
          OR: conditions,
        },
        select: { id: true, organizationId: true },
      })

      instanceId = config?.id ?? null
      organizationId = config?.organizationId ?? null

      if (config?.id) {
        await prisma.whatsAppConfig
          .update({
            where: { id: config.id },
            data: { lastWebhookAt: new Date() },
          })
          .catch(() => {})
      }

      // Update the webhook log with the identified organization
      if (webhookLogId && organizationId) {
        await prisma.whatsAppWebhookLog
          .update({
            where: { id: webhookLogId },
            data: { organizationId },
          })
          .catch(() => {})
      }
    }

    const echoEvents = changes?.field === 'smb_message_echoes' ? (value?.message_echoes ?? []) : []
    if (echoEvents.length > 0 && instanceId) {
      for (const echo of echoEvents) {
        try {
          await WhatsAppChatService.processMessageEcho(instanceId, echo)
        } catch {
          // non-blocking
        }
      }
    }

    if (value?.statuses && instanceId) {
      for (const status of value.statuses) {
        try {
          await WhatsAppChatService.processStatusUpdate(instanceId, status)
        } catch {
          // non-blocking
        }
      }
    }

    if (webhookLogId) {
      await prisma.whatsAppWebhookLog
        .update({
          where: { id: webhookLogId },
          data: {
            processed: true,
            processedAt: new Date(),
          },
        })
        .catch(() => {})
    }

    return {
      received: true,
      logId: webhookLogId,
    }
  } catch {
    return { received: true }
  }
}
