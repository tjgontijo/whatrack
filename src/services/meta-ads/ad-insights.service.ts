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

        const results = {
            accountSummary: [] as any[],
            campaigns: [] as any[],
        };

        for (const conn of connections) {
            const token = await metaAccessTokenService.getDecryptedToken(conn.id);

            // Fetch Spend from Meta for all active accounts of this organization
            const activeAccounts = await prisma.metaAdAccount.findMany({
                where: { organizationId, connectionId: conn.id, isActive: true },
            });

            for (const acc of activeAccounts) {
                try {
                    // 1. Get Spend from Meta (Account Level)
                    const accountInsightsResponse = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/${acc.adAccountId}/insights`, {
                        params: {
                            access_token: token,
                            level: 'account',
                            time_range: JSON.stringify({ since: dateStartStr, until: dateEndStr }),
                            fields: 'spend,impressions,clicks',
                        },
                    });

                    const metaData = accountInsightsResponse.data.data?.[0] || { spend: '0', impressions: '0', clicks: '0' };

                    // 1.b Get Spend from Meta (Campaign Level)
                    const campaignInsightsResponse = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/${acc.adAccountId}/insights`, {
                        params: {
                            access_token: token,
                            level: 'campaign',
                            time_range: JSON.stringify({ since: dateStartStr, until: dateEndStr }),
                            fields: 'campaign_id,campaign_name,spend,impressions,clicks',
                            limit: 100
                        },
                    });

                    const metaCampaigns = campaignInsightsResponse.data.data || [];

                    // 2. Get Revenue from Local DB (Account Level)
                    const accountSales = await prisma.sale.aggregate({
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

                    const revenue = Number(accountSales._sum.totalAmount || 0);
                    const spend = Number(metaData.spend || 0);

                    results.accountSummary.push({
                        accountId: acc.adAccountId,
                        accountName: acc.adAccountName,
                        spend,
                        revenue,
                        roas: spend > 0 ? (revenue / spend).toFixed(2) : '0.00',
                        impressions: Number(metaData.impressions),
                        clicks: Number(metaData.clicks),
                    });

                    // 3. Process each campaign
                    for (const camp of metaCampaigns) {
                        // Get revenue for this specific campaign
                        const campSales = await prisma.sale.aggregate({
                            where: {
                                organizationId,
                                status: 'paid',
                                createdAt: { gte: dateStart },
                                ticket: {
                                    tracking: {
                                        metaCampaignId: camp.campaign_id
                                    }
                                }
                            },
                            _sum: {
                                totalAmount: true
                            }
                        });

                        const campRevenue = Number(campSales._sum.totalAmount || 0);
                        const campSpend = Number(camp.spend || 0);

                        results.campaigns.push({
                            campaignId: camp.campaign_id,
                            campaignName: camp.campaign_name,
                            accountName: acc.adAccountName,
                            spend: campSpend,
                            revenue: campRevenue,
                            roas: campSpend > 0 ? (campRevenue / campSpend).toFixed(2) : '0.00',
                            impressions: Number(camp.impressions),
                            clicks: Number(camp.clicks),
                        });
                    }

                } catch (error: any) {
                    console.error(`[Insights] Error fetching for account ${acc.adAccountId}:`, error?.response?.data || error.message);
                }
            }
        }

        return results;
    }
}

export const metaAdInsightsService = new MetaAdInsightsService();
