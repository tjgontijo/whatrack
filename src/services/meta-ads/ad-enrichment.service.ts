import { prisma } from '@/lib/prisma';
import { metaAccessTokenService } from './access-token.service';
import axios from 'axios';

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v25.0';

export class MetaAdEnrichmentService {
    /**
     * Enrich Ticket Tracking with Ad names and hierarchy
     */
    async enrichTicket(ticketId: string) {
        const tracking = await prisma.ticketTracking.findUnique({
            where: { ticketId },
            include: {
                ticket: {
                    include: {
                        organization: {
                            include: { metaConnections: { where: { status: 'ACTIVE' }, take: 1 } }
                        }
                    }
                }
            }
        });

        if (!tracking || !tracking.metaAdId) return;
        if (tracking.metaEnrichmentStatus === 'SUCCESS') return;

        // Use the first active connection found for the organization
        // (In a more complex setup, we'd find the one that has access to this specific ad)
        const connection = tracking.ticket.organization.metaConnections[0];
        if (!connection) {
            console.warn(`[Enrichment] No active Meta connection for organization ${tracking.ticket.organizationId}`);
            return;
        }

        const token = await metaAccessTokenService.getDecryptedToken(connection.id);

        try {
            // 1. Fetch Ad Details
            const adResponse = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/${tracking.metaAdId}`, {
                params: {
                    access_token: token,
                    fields: 'name,adset{id,name},campaign{id,name},account_id',
                },
            });

            const adData = adResponse.data;

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
                }
            });

            console.log(`[Enrichment] Successfully enriched ticket ${ticketId} with Ad "${adData.name}"`);

        } catch (error: any) {
            console.error(`[Enrichment] Error enriching ticket ${ticketId}:`, error?.response?.data || error.message);

            await prisma.ticketTracking.update({
                where: { ticketId },
                data: {
                    metaEnrichmentStatus: 'FAILED',
                    metaEnrichmentError: error?.response?.data?.error?.message || error.message,
                    lastEnrichmentAt: new Date(),
                }
            });
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
            take: 20
        });

        for (const p of pendings) {
            await this.enrichTicket(p.ticketId);
        }
    }
}

export const metaAdEnrichmentService = new MetaAdEnrichmentService();
