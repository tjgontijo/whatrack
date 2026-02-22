import { prisma } from '@/lib/prisma';
import { metaAccessTokenService } from './access-token.service';
import axios from 'axios';

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v20.0';

export class MetaCampaignsService {
    async getCampaigns(organizationId: string, searchParams: { days?: number, accountId?: string } = {}) {
        const days = searchParams.days ? Number(searchParams.days) : 30;
        const accountFilter = searchParams.accountId;

        const dateStart = new Date();
        if (days > 1) {
            dateStart.setDate(dateStart.getDate() - (days - 1));
        }
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
                    // Fetch campaigns with insights edge using root time_range
                    const fields = [
                        'id',
                        'name',
                        'status',
                        'daily_budget',
                        'lifetime_budget',
                        `insights.time_range(${timeRangeStr}){spend,impressions,clicks,inline_link_clicks,reach,actions,action_values}`
                    ].join(',');

                    const response = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/${acc.adAccountId}/campaigns`, {
                        params: {
                            access_token: token,
                            fields: fields,
                            limit: 100
                        },
                    });

                    const campaignsData = response.data.data || [];

                    for (const camp of campaignsData) {
                        const insights = camp.insights?.data?.[0] || {};

                        // Parse actions
                        const actions = insights.actions || [];
                        const actionValues = insights.action_values || [];

                        const getActionVal = (list: any[], actionType: string) => {
                            let item = list.find((a: any) => a.action_type === actionType);
                            if (!item) {
                                item = list.find((a: any) => a.action_type === `offsite_conversion.fb_pixel_${actionType}`);
                            }
                            return item ? Number(item.value) : 0;
                        };

                        // Meta Raw Metrics
                        const spend = Number(insights.spend || 0);
                        const impressions = Number(insights.impressions || 0);
                        const reach = Number(insights.reach || 0);

                        // Clicks strategy: Use inline_link_clicks/link_click first, else clicks
                        const fbClicks = Number(insights.clicks || 0);
                        const linkClicks = getActionVal(actions, 'link_click');
                        const finalClicks = linkClicks > 0 ? linkClicks : fbClicks;

                        // Conversions / Goals
                        const purchases = getActionVal(actions, 'purchase');
                        const purchaseValue = getActionVal(actionValues, 'purchase');
                        const initiateCheckout = getActionVal(actions, 'initiate_checkout');
                        const landingPageViews = getActionVal(actions, 'landing_page_view');
                        const addsToCart = getActionVal(actions, 'add_to_cart');

                        // Computed Performance Metrics (to save API payload weight)
                        const cpaMeta = purchases > 0 ? (spend / purchases) : 0;
                        const ctiMeta = initiateCheckout > 0 ? (spend / initiateCheckout) : 0;
                        const cpvMeta = landingPageViews > 0 ? (spend / landingPageViews) : 0;
                        const cpatcMeta = addsToCart > 0 ? (spend / addsToCart) : 0;

                        const cpcMeta = finalClicks > 0 ? (spend / finalClicks) : 0;
                        const ctrMeta = impressions > 0 ? (finalClicks / impressions) * 100 : 0;
                        const cpmMeta = impressions > 0 ? (spend / impressions) * 1000 : 0;
                        const frequencyMeta = reach > 0 ? (impressions / reach) : 0;

                        const metaProfit = purchaseValue - spend;

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
                            impressions,
                            clicks: finalClicks,
                            cpc: cpcMeta,
                            ctr: ctrMeta,
                            cpm: cpmMeta,
                            reach: reach,
                            frequency: frequencyMeta,

                            // Meta Actions
                            metaPurchases: purchases,
                            metaRevenue: purchaseValue,
                            metaProfit: metaProfit,
                            metaCpa: cpaMeta,
                            metaRoas: spend > 0 ? (purchaseValue / spend) : 0,

                            initiateCheckout,
                            metaCti: ctiMeta,
                            landingPageViews,
                            metaCpv: cpvMeta,
                            addsToCart,
                            metaCpatc: cpatcMeta,
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
