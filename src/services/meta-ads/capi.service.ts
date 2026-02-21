import { prisma } from '@/lib/prisma';
import { metaAccessTokenService } from './access-token.service';
import crypto from 'crypto';
import axios from 'axios';

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v25.0';

interface CapiEventOptions {
    value?: number;
    currency?: string;
    eventId: string;
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
            include: {
                organization: {
                    include: {
                        metaConnections: { where: { status: 'ACTIVE' }, take: 1 },
                        metaAdAccounts: {
                            where: { isActive: true },
                            include: { pixels: true }
                        }
                    }
                },
                conversation: { include: { lead: true } },
                tracking: true
            }
        });

        if (!ticket || !ticket.tracking || !ticket.tracking.ctwaclid) {
            console.log(`[CAPI] Skipping ticket ${ticketId}: No CTWA CLID found.`);
            return;
        }

        // 1. Find the Pixels/Datasets
        // We try to find the pixels configured for the ad account of this ticket
        // If not found, we use the first active ad account with pixels for the organization
        let targetPixels = ticket.organization.metaAdAccounts.find(
            acc => acc.adAccountId === ticket.tracking?.metaAccountId
        )?.pixels;

        if (!targetPixels || targetPixels.length === 0) {
            targetPixels = ticket.organization.metaAdAccounts.find(acc => acc.pixels.length > 0)?.pixels;
        }

        if (!targetPixels || targetPixels.length === 0) {
            console.warn(`[CAPI] No Pixels found for organization ${ticket.organizationId}.`);
            return;
        }

        // 2. Hash User Data
        const phone = ticket.conversation.lead.phone;
        const hashedPhone = phone ? this.hashData(this.normalizePhone(phone)) : null;

        // 3. Send event to each pixel asynchronously
        for (const pixel of targetPixels) {
            if (!pixel.capiToken) {
                console.warn(`[CAPI] Skipping pixel ${pixel.pixelId}: No CAPI Token configured.`);
                continue;
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
                    }
                ],
                access_token: pixel.capiToken,
            };

            try {
                const response = await axios.post(
                    `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixel.pixelId}/events`,
                    payload
                );

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
                    }
                });

                console.log(`[CAPI] Successfully sent ${eventName} to pixel ${pixel.pixelId} for ticket ${ticketId}`);

            } catch (error: any) {
                const errorMsg = error?.response?.data?.error?.message || error.message;
                console.error(`[CAPI] Error sending ${eventName} to pixel ${pixel.pixelId}:`, errorMsg);

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
                    }
                });
            }
        }
    }

    private hashData(data: string): string {
        return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
    }

    private normalizePhone(phone: string): string {
        // Remove non-digits
        return phone.replace(/\D/g, '');
    }
}

export const metaCapiService = new MetaCapiService();
