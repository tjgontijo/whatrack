import "server-only"
import crypto from 'node:crypto'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { getMetaApiErrorMessage, MetaApiError, metaApiRequest } from './meta-api'

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
    dealId: string,
    eventName: 'LeadSubmitted' | 'Purchase',
    options: CapiEventOptions
  ) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        organizationId: true,
        projectId: true,
        project: {
          select: {
            id: true,
            organizationId: true,
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

    if (!deal?.tracking?.ctwaclid) {
      logger.info(`[CAPI] Skipping deal ${dealId}: No CTWA CLID found.`)
      return
    }

    if (
      !deal.projectId ||
      !deal.project ||
      deal.project.organizationId !== deal.organizationId
    ) {
      logger.warn(`[CAPI] Deal ${dealId} has invalid or missing project reference.`)
      return
    }

    // 1. Find the active Pixels for the deal's project only
    const targetPixels = await prisma.metaPixel.findMany({
      where: {
        organizationId: deal.organizationId,
        projectId: deal.projectId,
        isActive: true,
      },
      select: {
        pixelId: true,
        capiToken: true,
      },
    })

    if (!targetPixels || targetPixels.length === 0) {
      logger.warn(
        `[CAPI] No Pixels found for project ${deal.projectId} in organization ${deal.organizationId}.`
      )
      return
    }

    // 2. Hash User Data
    const phone = deal.conversation.lead.phone
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
            event_source_url: deal.tracking.landingPage || '',
            user_data: {
              external_id: [this.hashData(deal.conversation.lead.id)],
              ph: hashedPhone ? [hashedPhone] : [],
              ctwa_clid: deal.tracking.ctwaclid,
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
        const response = await metaApiRequest<{ events_received?: number }>(
          `${pixel.pixelId}/events`,
          {
            method: 'POST',
            body: payload,
          }
        )

        // Log to MetaConversionEvent table
        await prisma.metaConversionEvent.upsert({
          where: { dealId_pixelId_eventName: { dealId, pixelId: pixel.pixelId, eventName } }, // NOTE: unique constraint may fail if multiple pixels send same eventName, but it currently overwrites
          update: {
            status: 'SENT',
            success: true,
            fbtraceId: response.headers.get('x-fb-trace-id'),
            sentAt: new Date(),
          },
          create: {
            organizationId: deal.organizationId,
            dealId,
            pixelId: pixel.pixelId,
            eventName,
            status: 'SENT',
            success: true,
            eventId: options.eventId,
            ctwaclid: deal.tracking.ctwaclid,
            metaAdId: deal.tracking.metaAdId,
            fbtraceId: response.headers.get('x-fb-trace-id') ?? undefined,
            value: options.value,
            currency: options.currency || 'BRL',
          },
        })

        logger.info(
          `[CAPI] Successfully sent ${eventName} to pixel ${pixel.pixelId} for deal ${dealId}`
        )
      } catch (error: unknown) {
        const errorMsg = getMetaApiErrorMessage(error)
        const metaError =
          error instanceof MetaApiError
            ? (error.data as { error?: { code?: number | string } })
            : undefined
        logger.error(
          { err: errorMsg },
          `[CAPI] Error sending ${eventName} to pixel ${pixel.pixelId}`
        )

        await prisma.metaConversionEvent.upsert({
          where: { dealId_pixelId_eventName: { dealId, pixelId: pixel.pixelId, eventName } },
          update: {
            status: 'FAILED',
            success: false,
            errorCode: metaError?.error?.code?.toString(),
            errorMessage: errorMsg,
            sentAt: new Date(),
          },
          create: {
            organizationId: deal.organizationId,
            dealId,
            pixelId: pixel.pixelId,
            eventName,
            status: 'FAILED',
            success: false,
            eventId: options.eventId,
            ctwaclid: deal.tracking.ctwaclid,
            metaAdId: deal.tracking.metaAdId,
            errorCode: metaError?.error?.code?.toString(),
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
