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
    eventName: string,
    pixelId: string,
    options: CapiEventOptions & { fireOnce?: boolean }
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

    // Check fireOnce if enabled
    if (options.fireOnce) {
      const existing = await prisma.metaConversionEvent.findFirst({
        where: { dealId, pixelId, eventName, status: 'SENT' },
      })
      if (existing) {
        logger.info(`[CAPI] SKIPPED_DUPLICATE deal=${dealId} pixel=${pixelId} event=${eventName}`)
        return
      }
    }

    // 1. Find the specific active Pixel for the deal's project
    const pixel = await prisma.metaPixel.findFirst({
      where: {
        id: pixelId,
        organizationId: deal.organizationId,
        projectId: deal.projectId,
        isActive: true,
      },
      select: {
        id: true,
        pixelId: true,
        capiToken: true,
      },
    })

    if (!pixel) {
      logger.warn(
        `[CAPI] Pixel ${pixelId} not found or inactive for project ${deal.projectId} in organization ${deal.organizationId}.`
      )
      return
    }

    // 2. Hash User Data
    const phone = deal.conversation.lead.phone
    const hashedPhone = phone ? this.hashData(this.normalizePhone(phone)) : null

    // 3. Send event to the pixel
    if (!pixel.capiToken) {
      logger.warn(`[CAPI] Skipping pixel ${pixel.pixelId}: No CAPI Token configured.`)
      return
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
        where: { dealId_pixelId_eventName: { dealId, pixelId: pixel.id, eventName } },
        update: {
          status: 'SENT',
          success: true,
          fbtraceId: response.headers.get('x-fb-trace-id'),
          sentAt: new Date(),
        },
        create: {
          organizationId: deal.organizationId,
          projectId: deal.projectId,
          dealId,
          pixelId: pixel.id,
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
        where: { dealId_pixelId_eventName: { dealId, pixelId: pixel.id, eventName } },
        update: {
          status: 'FAILED',
          success: false,
          errorCode: metaError?.error?.code?.toString(),
          errorMessage: errorMsg,
          sentAt: new Date(),
        },
        create: {
          organizationId: deal.organizationId,
          projectId: deal.projectId,
          dealId,
          pixelId: pixel.id,
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

  private hashData(data: string): string {
    return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex')
  }

  private normalizePhone(phone: string): string {
    // Remove non-digits
    return phone.replace(/\D/g, '')
  }
}

export const metaCapiService = new MetaCapiService()
