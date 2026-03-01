import { prisma } from '@/lib/db/prisma'
import { metaAccessTokenService } from './access-token.service'
import crypto from 'crypto'
import axios from 'axios'
import { logger } from '@/lib/utils/logger'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`[CapiService] ${name} environment variable is required`)
  return value
}

interface CapiEventOptions {
  value?: number
  currency?: string
  eventId: string
}

export class MetaCapiService {
  /**
   * Send Conversion Event to Meta CAPI
   */
  async sendEvent(
    ticketId: string,
    eventName: 'LeadSubmitted' | 'Purchase',
    options: CapiEventOptions
  ) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        organizationId: true,
        organization: {
          select: {
            metaPixels: {
              select: {
                pixelId: true,
                capiToken: true,
              },
              where: { isActive: true },
            },
          },
        },
        conversation: {
          select: {
            lead: {
              select: {
                id: true,
                phone: true,
              },
            },
          },
        },
        tracking: {
          select: {
            ctwaclid: true,
            landingPage: true,
            metaAdId: true,
          },
        },
      },
    })

    if (!ticket || !ticket.tracking || !ticket.tracking.ctwaclid) {
      logger.info(`[CAPI] Skipping ticket ${ticketId}: No CTWA CLID found.`)
      return
    }

    // 1. Find the active Pixels for the organization
    let targetPixels = ticket.organization.metaPixels

    if (!targetPixels || targetPixels.length === 0) {
      logger.warn(`[CAPI] No Pixels found for organization ${ticket.organizationId}.`)
      return
    }

    // 2. Hash User Data
    const phone = ticket.conversation.lead.phone
    const hashedPhone = phone ? this.hashData(this.normalizePhone(phone)) : null

    // 3. Send event to each pixel asynchronously
    for (const pixel of targetPixels) {
      if (!pixel.capiToken) {
        logger.warn(`[CAPI] Skipping pixel ${pixel.pixelId}: No CAPI Token configured.`)
        continue
      }

      const payload = {
        data: [
          {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'business_messaging',
            event_id: options.eventId,
            event_source_url: ticket.tracking.landingPage || '',
            user_data: {
              external_id: [this.hashData(ticket.conversation.lead.id)],
              ph: hashedPhone ? [hashedPhone] : [],
              ctwa_clid: ticket.tracking.ctwaclid,
            },
            custom_data: {
              value: options.value,
              currency: options.currency || 'BRL',
            },
          },
        ],
        access_token: pixel.capiToken,
      }

      try {
        const response = await axios.post(
          `https://graph.facebook.com/${requireEnv('META_API_VERSION')}/${pixel.pixelId}/events`,
          payload
        )

        // Log to MetaConversionEvent table
        await prisma.metaConversionEvent.upsert({
          where: { ticketId_eventName: { ticketId, eventName } }, // NOTE: unique constraint may fail if multiple pixels send same eventName, but it currently overwrites
          update: {
            status: 'SENT',
            success: true,
            fbtraceId: response.headers['x-fb-trace-id'],
            sentAt: new Date(),
          },
          create: {
            organizationId: ticket.organizationId,
            ticketId,
            eventName,
            status: 'SENT',
            success: true,
            eventId: options.eventId,
            ctwaclid: ticket.tracking.ctwaclid,
            metaAdId: ticket.tracking.metaAdId,
            fbtraceId: response.headers['x-fb-trace-id'] as string,
            value: options.value,
            currency: options.currency || 'BRL',
          },
        })

        logger.info(
          `[CAPI] Successfully sent ${eventName} to pixel ${pixel.pixelId} for ticket ${ticketId}`
        )
      } catch (error: any) {
        const errorMsg = error?.response?.data?.error?.message || error.message
        logger.error({ err: errorMsg }, `[CAPI] Error sending ${eventName} to pixel ${pixel.pixelId}`)

        await prisma.metaConversionEvent.upsert({
          where: { ticketId_eventName: { ticketId, eventName } },
          update: {
            status: 'FAILED',
            success: false,
            errorCode: error?.response?.data?.error?.code?.toString(),
            errorMessage: errorMsg,
            sentAt: new Date(),
          },
          create: {
            organizationId: ticket.organizationId,
            ticketId,
            eventName,
            status: 'FAILED',
            success: false,
            eventId: options.eventId,
            errorCode: error?.response?.data?.error?.code?.toString(),
            errorMessage: errorMsg,
          },
        })
      }
    }
  }

  private hashData(data: string): string {
    return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex')
  }

  private normalizePhone(phone: string): string {
    // Remove non-digits
    return phone.replace(/\D/g, '')
  }
}

export const metaCapiService = new MetaCapiService()
