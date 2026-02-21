import { prisma } from '@/lib/prisma';
import { metaAccessTokenService } from './access-token.service';
import axios from 'axios';

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v25.0';

interface MetaAdAccountResponse {
    id: string;
    name: string;
    account_status: number;
}

export class MetaAdAccountService {
    /**
     * Fetch Ad Accounts from Meta API and sync with local DB
     */
    async syncAdAccounts(connectionId: string) {
        const connection = await prisma.metaConnection.findUnique({
            where: { id: connectionId },
        });

        if (!connection) throw new Error('Meta Connection not found');

        const token = await metaAccessTokenService.getDecryptedToken(connectionId);

        // Fetch accounts available to this user
        const response = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/me/adaccounts`, {
            params: {
                access_token: token,
                fields: 'id,name,account_status',
                limit: 100,
            },
        });

        const accounts: MetaAdAccountResponse[] = response.data.data;

        // Batch upsert accounts
        for (const acc of accounts) {
            await prisma.metaAdAccount.upsert({
                where: {
                    organizationId_adAccountId: {
                        organizationId: connection.organizationId,
                        adAccountId: acc.id,
                    },
                },
                update: {
                    adAccountName: acc.name,
                    connectionId: connection.id,
                },
                create: {
                    organizationId: connection.organizationId,
                    connectionId: connection.id,
                    adAccountId: acc.id,
                    adAccountName: acc.name,
                    isActive: false, // Default is inactive
                },
            });
        }

        return await prisma.metaAdAccount.findMany({
            where: { connectionId },
        });
    }

    /**
     * Toggle Ad Account Tracking
     */
    async toggleAccount(accountId: string, isActive: boolean) {
        return await prisma.metaAdAccount.update({
            where: { id: accountId },
            data: { isActive },
        });
    }

    /**
     * Save Pixels and CAPI Tokens for an Ad Account
     */
    async saveAdAccountPixels(accountId: string, pixels: { pixelId: string; capiToken: string }[]) {
        // Delete existing and recreate
        return await prisma.$transaction(async (tx) => {
            await tx.metaAdAccountPixel.deleteMany({
                where: { adAccountId: accountId }
            });

            if (pixels.length > 0) {
                await tx.metaAdAccountPixel.createMany({
                    data: pixels.map(p => ({
                        adAccountId: accountId,
                        pixelId: p.pixelId,
                        capiToken: p.capiToken
                    }))
                });
            }

            return tx.metaAdAccount.findUnique({
                where: { id: accountId },
                include: { pixels: true }
            });
        });
    }

    /**
     * Fetch Pixels / Datasets for an Ad Account
     */
    async getAdAccountPixels(id: string) {
        const adAccount = await prisma.metaAdAccount.findUnique({
            where: { id },
            include: { connection: true }
        });

        if (!adAccount || !adAccount.connection) throw new Error('Ad Account or Connection not found');

        const token = await metaAccessTokenService.getDecryptedToken(adAccount.connectionId);

        try {
            const response = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/${adAccount.adAccountId}/adspixels`, {
                params: {
                    access_token: token,
                    fields: 'id,name',
                    limit: 100,
                }
            });

            return response.data.data || [];
        } catch (error: any) {
            console.error('[MetaAdAccountService] Error fetching pixels:', error?.response?.data || error.message);
            return [];
        }
    }

    /**
     * Get active accounts for an organization
     */
    async getActiveAccounts(organizationId: string) {
        return await prisma.metaAdAccount.findMany({
            where: {
                organizationId,
                isActive: true,
            },
            include: {
                connection: true,
                pixels: true,
            },
        });
    }
}

export const metaAdAccountService = new MetaAdAccountService();
