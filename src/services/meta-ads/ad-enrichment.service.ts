import { prisma } from '@/lib/db/prisma'
import { metaAccessTokenService } from './access-token.service'
import axios from 'axios'
import { logger } from '@/lib/utils/logger'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`[AdEnrichmentService] ${name} environment variable is required`)
  return value
}

function resolveEnrichmentErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined
    return data?.error?.message ?? error.message
  }

  if (error instanceof Error) return error.message
  return 'Erro desconhecido'
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

    if (!tracking.ticket.project || tracking.ticket.project.organizationId !== tracking.ticket.organizationId) {
      logger.warn(
        `[Enrichment] Ticket ${ticketId} has invalid project reference.`
      )
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
      const adResponse = await axios.get(
        `https://graph.facebook.com/${requireEnv('META_API_VERSION')}/${tracking.metaAdId}`,
        {
          params: {
            access_token: token,
            fields: 'name,adset{id,name},campaign{id,name},account_id',
          },
        }
      )

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

      logger.error({ err: error, context: axios.isAxiosError(error) ? error.response?.data : message }, `[Enrichment] Error enriching ticket ${ticketId}`)

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
