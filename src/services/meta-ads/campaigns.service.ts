import { prisma } from '@/lib/prisma';
import { metaAccessTokenService } from './access-token.service';
import axios from 'axios';

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v20.0';

export class MetaCampaignsService {
    async getCampaigns(organizationId: string, searchParams: { days?: number, accountId?: string } = {}) {
        const days = searchParams.days || 30;
        const accountFilter = searchParams.accountId;

        const dateStart = new Date();
        dateStart.setDate(dateStart.getDate() - days);
        const dateStartStr = dateStart.toISOString().split('T')[0];
        const dateEndStr = new Date().toISOString().split('T')[0];
        const timeRangeStr = JSON.stringify({ since: dateStartStr, until: dateEndStr });

        const connections = await prisma.metaConnection.findMany({
            where: { organizationId, status: 'ACTIVE' },
        });

        if (connections.length === 0) return [];

        let allCampaigns: any[] = [];

        for (const conn of connections) {
            const token = await metaAccessTokenService.getDecryptedToken(conn.id);

            const whereClause: any = { organizationId, connectionId: conn.id, isActive: true };
            if (accountFilter) {
                whereClause.adAccountId = accountFilter;
            }

            const activeAccounts = await prisma.metaAdAccount.findMany({
                where: whereClause,
            });

            for (const acc of activeAccounts) {
                try {
                    // Fetch campaigns with insights edge
                    const fields = [
                        'id',
                        'name',
                        'status',
                        'daily_budget',
                        'lifetime_budget',
                        `insights.time_range(${timeRangeStr}){spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,action_values,cost_per_action_type}`
                    ].join(',');

                    const response = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/${acc.adAccountId}/campaigns`, {
                        params: {
                            access_token: token,
                            fields: fields,
                            limit: 100,
                            // Optionally add filtering by status if needed, but we'll fetch all and filter in UI
                        },
                    });

                    const campaignsData = response.data.data || [];

                    for (const camp of campaignsData) {
                        const insights = camp.insights?.data?.[0] || {};

                        // Parse actions
                        const actions = insights.actions || [];
                        const actionValues = insights.action_values || [];
                        const costPerAction = insights.cost_per_action_type || [];

                        const getActionVal = (list: any[], actionType: string) => {
                            const item = list.find((a: any) => a.action_type === actionType);
                            return item ? Number(item.value) : 0;
                        };

                        // Meta Metrics
                        const spend = Number(insights.spend || 0);
                        const purchases = getActionVal(actions, 'purchase');
                        const purchaseValue = getActionVal(actionValues, 'purchase');
                        const initiateCheckout = getActionVal(actions, 'initiate_checkout');
                        const landingPageViews = getActionVal(actions, 'landing_page_view');
                        const addsToCart = getActionVal(actions, 'add_to_cart');

                        const cpaMeta = getActionVal(costPerAction, 'purchase');
                        const ctiMeta = getActionVal(costPerAction, 'initiate_checkout');
                        const cpvMeta = getActionVal(costPerAction, 'landing_page_view');
                        const cpatcMeta = getActionVal(costPerAction, 'add_to_cart');

                        // Local System Tracking Metrics (Whatrack)
                        const localSales = await prisma.sale.aggregate({
                            where: {
                                organizationId,
                                status: 'paid',
                                createdAt: { gte: dateStart },
                                ticket: {
                                    tracking: { metaCampaignId: camp.id }
                                }
                            },
                            _sum: { totalAmount: true },
                            _count: { id: true }
                        });

                        const localRevenue = Number(localSales._sum.totalAmount || 0);
                        const localPurchases = Number(localSales._count.id || 0);
                        const localRoi = spend > 0 ? (localRevenue / spend) : 0;
                        const localCpa = localPurchases > 0 ? (spend / localPurchases) : spend;
                        const localProfit = localRevenue - spend; // Simplification without product cost

                        allCampaigns.push({
                            id: camp.id,
                            accountId: acc.adAccountId,
                            accountName: acc.adAccountName,
                            name: camp.name,
                            status: camp.status,
                            dailyBudget: camp.daily_budget ? Number(camp.daily_budget) / 100 : null,
                            lifetimeBudget: camp.lifetime_budget ? Number(camp.lifetime_budget) / 100 : null,

                            // Spend / Meta Data
                            spend,
                            impressions: Number(insights.impressions || 0),
                            clicks: Number(insights.clicks || 0),
                            cpc: Number(insights.cpc || 0),
                            ctr: Number(insights.ctr || 0),
                            cpm: Number(insights.cpm || 0),
                            reach: Number(insights.reach || 0),
                            frequency: Number(insights.frequency || 0),

                            // Meta Actions
                            metaPurchases: purchases,
                            metaRevenue: purchaseValue,
                            metaCpa: cpaMeta,
                            metaRoas: spend > 0 ? (purchaseValue / spend) : 0,

                            initiateCheckout,
                            metaCti: ctiMeta,
                            landingPageViews,
                            metaCpv: cpvMeta,
                            addsToCart,
                            metaCpatc: cpatcMeta,

                            // Local Actions
                            localPurchases,
                            localRevenue,
                            localRoi,
                            localCpa,
                            localProfit
                        });
                    }
                } catch (error: any) {
                    console.error(`[Campaigns Service] Error fetching for account ${acc.adAccountId}:`, error?.response?.data || error.message);
                }
            }
        }

        return allCampaigns;
    }
}

export const metaCampaignsService = new MetaCampaignsService();
