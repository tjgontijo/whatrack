import { prisma } from '@/lib/prisma';
import { metaAccessTokenService } from './access-token.service';
import axios from 'axios';

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v25.0';

export class MetaAdInsightsService {
    /**
     * Fetch Spend from Meta and combine with Local Revenue
     */
    async getROI(organizationId: string, days: number = 30) {
        const connections = await prisma.metaConnection.findMany({
            where: { organizationId, status: 'ACTIVE' },
        });

        if (connections.length === 0) return [];

        const dateStart = new Date();
        dateStart.setDate(dateStart.getDate() - days);
        const dateStartStr = dateStart.toISOString().split('T')[0];
        const dateEndStr = new Date().toISOString().split('T')[0];

        const results = [];

        for (const conn of connections) {
            const token = await metaAccessTokenService.getDecryptedToken(conn.id);

            // Fetch Spend from Meta for all active accounts of this organization
            const activeAccounts = await prisma.metaAdAccount.findMany({
                where: { organizationId, connectionId: conn.id, isActive: true },
            });

            for (const acc of activeAccounts) {
                try {
                    // 1. Get Spend from Meta
                    const insightsResponse = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/${acc.adAccountId}/insights`, {
                        params: {
                            access_token: token,
                            level: 'account',
                            time_range: JSON.stringify({ since: dateStartStr, until: dateEndStr }),
                            fields: 'spend,impressions,clicks',
                        },
                    });

                    const metaData = insightsResponse.data.data?.[0] || { spend: '0', impressions: '0', clicks: '0' };

                    // 2. Get Revenue from Local DB
                    const sales = await prisma.sale.aggregate({
                        where: {
                            organizationId,
                            status: 'paid', // Only count paid sales
                            createdAt: { gte: dateStart },
                            ticket: {
                                tracking: {
                                    metaAccountId: acc.adAccountId
                                }
                            }
                        },
                        _sum: {
                            totalAmount: true
                        }
                    });

                    const revenue = Number(sales._sum.totalAmount || 0);
                    const spend = Number(metaData.spend || 0);

                    results.push({
                        accountId: acc.adAccountId,
                        accountName: acc.adAccountName,
                        spend,
                        revenue,
                        roas: spend > 0 ? (revenue / spend).toFixed(2) : '0.00',
                        impressions: Number(metaData.impressions),
                        clicks: Number(metaData.clicks),
                    });

                } catch (error: any) {
                    console.error(`[Insights] Error fetching for account ${acc.adAccountId}:`, error?.response?.data || error.message);
                }
            }
        }

        return results;
    }
}

export const metaAdInsightsService = new MetaAdInsightsService();
