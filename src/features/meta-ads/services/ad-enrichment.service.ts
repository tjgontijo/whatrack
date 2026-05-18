import "server-only"
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/utils/logger'
import { metaAccessTokenService } from './access-token.service'
import { getMetaApiErrorMessage, MetaApiError, metaApiRequest } from './meta-api'

function resolveEnrichmentErrorMessage(error: unknown): string {
  return getMetaApiErrorMessage(error)
}

export class MetaAdEnrichmentService {
  /**
   * Enrich Deal Tracking with Ad names and hierarchy
   */
  async enrichDeal(dealId: string) {
    const tracking = await prisma.dealTracking.findUnique({
      where: { dealId },
      select: {
        metaAdId: true,
        metaEnrichmentStatus: true,
        deal: {
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
          },
        },
      },
    })

    if (!tracking?.metaAdId) return
    if (tracking.metaEnrichmentStatus === 'SUCCESS') return

    if (
      !tracking.deal.projectId ||
      !tracking.deal.project ||
      tracking.deal.project.organizationId !== tracking.deal.organizationId
    ) {
      logger.warn(`[Enrichment] Deal ${dealId} has invalid or missing project reference.`)
      return
    }

    // Use the first active connection found for the deal's project
    const connection = await prisma.metaConnection.findFirst({
      where: {
        organizationId: tracking.deal.organizationId,
        projectId: tracking.deal.projectId,
        status: 'ACTIVE',
      },
      select: { id: true },
    })

    if (!connection) {
      logger.warn(
        `[Enrichment] No active Meta connection for project ${tracking.deal.projectId} in organization ${tracking.deal.organizationId}`
      )
      return
    }

    const token = await metaAccessTokenService.getDecryptedToken(connection.id)

    try {
      // 1. Fetch Ad Details
      const adResponse = await metaApiRequest<{
        name?: string
        adset?: { id?: string; name?: string }
        campaign?: { id?: string; name?: string }
        account_id?: string
      }>(tracking.metaAdId, {
        params: {
          access_token: token,
          fields: 'name,adset{id,name},campaign{id,name},account_id',
        },
      })

      const adData = adResponse.data

      await prisma.dealTracking.update({
        where: { dealId },
        data: {
          metaAdName: adData.name,
          metaAdSetId: adData.adset?.id,
          metaAdSetName: adData.adset?.name,
          metaCampaignId: adData.campaign?.id,
          metaCampaignName: adData.campaign?.name,
          metaAccountId: adData.account_id,
          metaEnrichmentStatus: 'SUCCESS',
          lastEnrichmentAt: new Date(),
          metaAdIdAtEnrichment: tracking.metaAdId,
        },
      })

      logger.info(`[Enrichment] Successfully enriched deal ${ticketId} with Ad "${adData.name}"`)
    } catch (error: unknown) {
      const message = resolveEnrichmentErrorMessage(error)

      logger.error(
        { err: error, context: error instanceof MetaApiError ? error.data : message },
        `[Enrichment] Error enriching deal ${ticketId}`
      )

      await prisma.dealTracking.update({
        where: { dealId },
        data: {
          metaEnrichmentStatus: 'FAILED',
          metaEnrichmentError: message,
          lastEnrichmentAt: new Date(),
        },
      })
    }
  }

  /**
   * Bulk enrich pending deals (useful for cron jobs)
   */
  async enrichPending() {
    const pendings = await prisma.dealTracking.findMany({
      where: {
        metaAdId: { not: null },
        metaEnrichmentStatus: 'PENDING',
      },
      take: 20,
    })

    for (const p of pendings) {
      await this.enrichTicket(p.ticketId)
    }
  }
}

export const metaAdEnrichmentService = new MetaAdEnrichmentService()
