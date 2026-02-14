import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/whatsapp/claim-waba
 * Vincula um WABA ID recém-criado/compartilhado à organização atual.
 * Chamado pelo frontend logo após o fechamento do popup do Embedded Signup.
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
        const { wabaId, code } = await request.json()

        if (!wabaId) {
            return NextResponse.json({ error: 'WABA ID is required' }, { status: 400 })
        }

        console.log(`[ClaimWaba] Request for WABA: ${wabaId}, Org: ${orgId}, HasCode: ${!!code}`)

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
                console.error('[ClaimWaba] Token exchange failed:', err.message)
                return NextResponse.json({ error: `Failed to exchange token: ${err.message}` }, { status: 502 })
            }
        }

        // 2. Use the client token if we have it, otherwise fallback to global (for existing own BM numbers)
        const token = clientAccessToken || MetaCloudService.accessToken

        // 3. Buscar detalhes do WABA na Meta para confirmar que temos acesso
        // e pegar o primeiro número de telefone disponível
        const phones = await MetaCloudService.listPhoneNumbers({ wabaId, accessToken: token })

        if (phones.length === 0) {
            console.warn('[ClaimWaba] No phone numbers found yet for WABA:', wabaId)
        }

        const primaryPhone = phones[0]

        // 4. Criar ou atualizar a configuração no banco
        const config = await prisma.whatsAppConfig.upsert({
            where: {
                phoneId: primaryPhone?.id || `pending_${wabaId}`
            },
            update: {
                wabaId,
                accessToken: clientAccessToken || undefined, // Only update if we got a new one
                tokenExpiresAt,
                authorizationCode: code,
                status: 'connected',
                verifiedName: primaryPhone?.verified_name,
                displayPhone: primaryPhone?.display_phone_number,
                updatedAt: new Date(),
            },
            create: {
                organizationId: orgId,
                wabaId,
                phoneId: primaryPhone?.id,
                accessToken: clientAccessToken || null,
                tokenExpiresAt,
                authorizationCode: code,
                status: 'connected',
                verifiedName: primaryPhone?.verified_name,
                displayPhone: primaryPhone?.display_phone_number,
            }
        })

        // 5. Tentar ativar o webhook (assinatura) automaticamente usando o token correto
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
