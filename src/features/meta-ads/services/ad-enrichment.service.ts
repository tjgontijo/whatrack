import { prisma } from '@/lib/db/prisma'
import { metaAccessTokenService } from './access-token.service'
import { logger } from '@/lib/utils/logger'
import { MetaApiError, getMetaApiErrorMessage, metaApiRequest } from './meta-api'

function resolveEnrichmentErrorMessage(error: unknown): string {
  return getMetaApiErrorMessage(error)
}

export class MetaAdEnrichmentService {
  /**
   * Enrich Ticket Tracking with Ad names and hierarchy
   */
  async enrichTicket(ticketId: string) {
    const tracking = await prisma.ticketTracking.findUnique({
      where: { ticketId },
      select: {
        metaAdId: true,
        metaEnrichmentStatus: true,
        ticket: {
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

    if (!tracking || !tracking.metaAdId) return
    if (tracking.metaEnrichmentStatus === 'SUCCESS') return

    if (
      !tracking.ticket.projectId ||
      !tracking.ticket.project ||
      tracking.ticket.project.organizationId !== tracking.ticket.organizationId
    ) {
      logger.warn(`[Enrichment] Ticket ${ticketId} has invalid or missing project reference.`)
      return
    }

    // Use the first active connection found for the ticket's project
    const connection = await prisma.metaConnection.findFirst({
      where: {
        organizationId: tracking.ticket.organizationId,
        projectId: tracking.ticket.projectId,
        status: 'ACTIVE',
      },
      select: { id: true },
    })

    if (!connection) {
      logger.warn(
        `[Enrichment] No active Meta connection for project ${tracking.ticket.projectId} in organization ${tracking.ticket.organizationId}`
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

      await prisma.ticketTracking.update({
        where: { ticketId },
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

      logger.info(`[Enrichment] Successfully enriched ticket ${ticketId} with Ad "${adData.name}"`)
    } catch (error: unknown) {
      const message = resolveEnrichmentErrorMessage(error)

      logger.error(
        { err: error, context: error instanceof MetaApiError ? error.data : message },
        `[Enrichment] Error enriching ticket ${ticketId}`
      )

      await prisma.ticketTracking.update({
        where: { ticketId },
        data: {
          metaEnrichmentStatus: 'FAILED',
          metaEnrichmentError: message,
          lastEnrichmentAt: new Date(),
        },
      })
    }
  }

  /**
   * Bulk enrich pending tickets (useful for cron jobs)
   */
  async enrichPending() {
    const pendings = await prisma.ticketTracking.findMany({
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
