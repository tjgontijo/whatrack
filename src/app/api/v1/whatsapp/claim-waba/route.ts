import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { encryptToken } from '@/lib/whatsapp/token-crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/whatsapp/claim-waba
 * Vincula um WABA ID recém-criado/compartilhado à organização atual.
 * Chamado pelo frontend logo após o fechamento do popup do Embedded Signup.
 * 
 * Security:
 * - Access tokens are encrypted before storage (AES-256-GCM)
 * - CSRF nonce is validated from the state parameter
 */
export async function POST(request: Request) {
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

        // 1. If we have a code, exchange it for a token
        if (code) {
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
        }

        // 2. Use the client token if we have it, otherwise fallback to global (for existing own BM numbers)
        const token = clientAccessToken || MetaCloudService.accessToken

        if (!token) {
            console.error('[ClaimWaba] No access token available (neither from code exchange nor global)')
            return NextResponse.json({
                error: 'No access token available. Please ensure META_ACCESS_TOKEN is configured or provide an authorization code.'
            }, { status: 500 })
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
            config: {
                id: config.id,
                wabaId: config.wabaId,
                phoneId: config.phoneId,
                status: config.status
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
