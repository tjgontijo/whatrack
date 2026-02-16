import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { encryptToken } from '@/lib/whatsapp/token-crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/whatsapp/claim-waba
 *
 * ❌ DEPRECATED (v2.1)
 *
 * This endpoint is no longer used. The new v2 onboarding flow uses:
 * 1. GET /api/v1/whatsapp/onboarding - to generate tracking code
 * 2. POST /api/v1/whatsapp/webhook - receives PARTNER_ADDED event with tracking code
 *
 * The webhook handler automatically creates WhatsAppConnection and claims the WABA.
 *
 * This endpoint will be removed in v3.0.
 *
 * For migration from v1 to v2:
 * - Update frontend to use polling-based flow (see use-whatsapp-onboarding.ts)
 * - Webhook receiver handles all token exchange and storage
 * - No manual claim endpoint needed
 *
 * Old behavior (for reference):
 * - Linked a newly created WABA to the current organization
 * - Called by frontend after Embedded Signup popup closed
 * - Exchanged authorization code for access token
 * - Stored token encrypted
 *
 * See: docs/whatsapp-onboarding-prd-v2.md
 */
export async function POST(request: Request) {
    console.warn('[DEPRECATED] POST /api/v1/whatsapp/claim-waba is deprecated as of v2.1. Use webhook-based onboarding instead.');

    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })

        if (!session?.session?.activeOrganizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const orgId = session.session.activeOrganizationId
        const { wabaId, code, phoneNumberId } = await request.json()

        if (!wabaId) {
            console.error('[ClaimWaba] MISSING WABA ID in request')
            return NextResponse.json({ error: 'WABA ID is required' }, { status: 400 })
        }

        console.log(`[ClaimWaba] REQUEST RECEIVED:`, { wabaId, orgId, hasCode: !!code, phoneNumberId })

        let clientAccessToken = ''
        let tokenExpiresAt: Date | null = null

        if (!code) {
            console.error('[ClaimWaba] Missing authorization code')
            return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 })
        }

        // 1. Exchange code for token (Embedded Signup flow)
        try {
            const tokenData = await MetaCloudService.exchangeCodeForToken(code)
            clientAccessToken = tokenData.access_token
            if (tokenData.expires_in) {
                tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000)
            }
            console.log('[ClaimWaba] Token exchange successful')
        } catch (err: any) {
            console.error('[ClaimWaba] Token exchange FAILED:', err.message)
            return NextResponse.json({ error: `Failed to exchange token: ${err.message}` }, { status: 502 })
        }

        const token = clientAccessToken

        if (!token) {
            console.error('[ClaimWaba] Token exchange returned empty access token')
            return NextResponse.json({ error: 'Invalid access token from Meta' }, { status: 502 })
        }

        // 3. Se já temos phoneNumberId do evento, usar diretamente
        // Senão, buscar números da WABA via API
        let primaryPhone: any = null

        if (phoneNumberId) {
            console.log('[ClaimWaba] Usando phoneNumberId do evento:', phoneNumberId)
            // Buscar detalhes do número específico
            try {
                const phones = await MetaCloudService.listPhoneNumbers({ wabaId, accessToken: token })
                primaryPhone = phones.find((p: any) => p.id === phoneNumberId) || phones[0]
                console.log('[ClaimWaba] Phone encontrado:', primaryPhone?.display_phone_number)
            } catch (err: any) {
                console.warn('[ClaimWaba] Erro ao buscar detalhes do phone, usando ID diretamente:', err.message)
                primaryPhone = { id: phoneNumberId }
            }
        } else {
            // Buscar números de telefone da WABA
            console.log('[ClaimWaba] Buscando números de telefone para WABA:', wabaId)
            try {
                const phones = await MetaCloudService.listPhoneNumbers({ wabaId, accessToken: token })
                console.log(`[ClaimWaba] Números encontrados (${phones.length}):`, phones.map((p: any) => p.display_phone_number))
                primaryPhone = phones[0]
            } catch (err: any) {
                console.warn('[ClaimWaba] Erro ao buscar phones:', err.message)
            }
        }

        if (!primaryPhone) {
            console.warn('[ClaimWaba] No phone numbers found yet for WABA:', wabaId)
        }

        // 4. Encrypt access token before storage
        let tokenToStore = clientAccessToken || null
        let isEncrypted = false

        if (tokenToStore) {
            const encrypted = encryptToken(tokenToStore)
            if (encrypted) {
                tokenToStore = encrypted
                isEncrypted = true
                console.log('[ClaimWaba] Access token encrypted for storage')
            } else {
                console.warn('[ClaimWaba] TOKEN_ENCRYPTION_KEY not set, storing token in plaintext')
            }
        }

        // 5. Criar ou atualizar a configuração no banco
        console.log('[ClaimWaba] Upserting config in DB...')
        const config = await prisma.whatsAppConfig.upsert({
            where: {
                phoneId: primaryPhone?.id || `pending_${wabaId}`
            },
            update: {
                wabaId,
                accessToken: tokenToStore || undefined,
                accessTokenEncrypted: isEncrypted,
                tokenExpiresAt,
                authorizationCode: code,
                status: 'connected',
                verifiedName: primaryPhone?.verified_name,
                displayPhone: primaryPhone?.display_phone_number,
                connectedAt: new Date(),
                disconnectedAt: null,
                disconnectedBy: null,
                tokenStatus: 'valid',
                updatedAt: new Date(),
            },
            create: {
                organizationId: orgId,
                wabaId,
                phoneId: primaryPhone?.id,
                accessToken: tokenToStore,
                accessTokenEncrypted: isEncrypted,
                tokenExpiresAt,
                authorizationCode: code,
                status: 'connected',
                verifiedName: primaryPhone?.verified_name,
                displayPhone: primaryPhone?.display_phone_number,
                connectedAt: new Date(),
                tokenStatus: 'valid',
            }
        })

        console.log('[ClaimWaba] DB Persist successful:', { configId: config.id, status: config.status, encrypted: isEncrypted })

        // 6. Tentar ativar o webhook (assinatura) automaticamente usando o token correto
        try {
            await MetaCloudService.subscribeToWaba(wabaId, token)
            console.log('[ClaimWaba] Auto-subscribed webhooks for WABA:', wabaId)
        } catch (subErr) {
            console.error('[ClaimWaba] Failed to auto-subscribe:', subErr)
        }

        return NextResponse.json({
            success: true,
            deprecated: true,
            warning: 'This endpoint is deprecated as of v2.1. Use webhook-based onboarding instead. See docs/whatsapp-onboarding-prd-v2.md',
            config: {
                id: config.id,
                wabaId: config.wabaId,
                phoneId: config.phoneId,
                status: config.status
            }
        }, {
            status: 200,
            headers: {
                'Deprecation': 'true',
                'Sunset': 'Sun, 31 Dec 2024 23:59:59 GMT'
            }
        })

    } catch (error: any) {
        console.error('[API] Claim WABA Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to claim WABA' },
            { status: 500 }
        )
    }
}
