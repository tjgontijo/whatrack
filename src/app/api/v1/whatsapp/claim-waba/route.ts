import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
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
        const { wabaId, code, phoneNumberId, redirectUri, projectId } = await request.json()

        if (!wabaId) {
            console.error('[ClaimWaba] MISSING WABA ID in request')
            return NextResponse.json({ error: 'WABA ID is required' }, { status: 400 })
        }

        if (!projectId) {
            console.error('[ClaimWaba] MISSING PROJECT ID in request')
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
        }

        // Validate project belongs to organization
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { organizationId: true }
        })

        if (!project || project.organizationId !== orgId) {
            console.error('[ClaimWaba] Project not found or does not belong to organization')
            return NextResponse.json({ error: 'Project not found or does not belong to your organization' }, { status: 404 })
        }

        console.log(`[ClaimWaba] REQUEST RECEIVED:`, { wabaId, orgId, hasCode: !!code, phoneNumberId })

        let clientAccessToken = ''
        let tokenExpiresAt: Date | null = null

        // 1. If we have a code, exchange it for a token
        if (code) {
            try {
                const tokenData = await MetaCloudService.exchangeCodeForToken(code, redirectUri)
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
                primaryPhone = phones.find((p: any) => p.id === phoneNumberId)

                if (!primaryPhone) {
                    console.error('[ClaimWaba] phoneNumberId não encontrado na WABA:', phoneNumberId)
                    return NextResponse.json({
                        error: `Número com ID ${phoneNumberId} não encontrado na WABA.`,
                        availablePhones: phones.map((p: any) => ({ id: p.id, displayPhoneNumber: p.display_phone_number }))
                    }, { status: 404 })
                }
                console.log('[ClaimWaba] Phone encontrado:', primaryPhone?.display_phone_number)
            } catch (err: any) {
                console.error('[ClaimWaba] Erro ao buscar detalhes do phone:', err.message)
                return NextResponse.json({ error: 'Erro ao buscar detalhes do número: ' + err.message }, { status: 502 })
            }
        } else {
            // Buscar números de telefone da WABA
            console.log('[ClaimWaba] Buscando números de telefone para WABA:', wabaId)
            try {
                const phones = await MetaCloudService.listPhoneNumbers({ wabaId, accessToken: token })
                console.log(`[ClaimWaba] Números encontrados (${phones.length}):`, phones.map((p: any) => p.display_phone_number))

                if (phones.length === 0) {
                    console.error('[ClaimWaba] Nenhum número encontrado na WABA')
                    return NextResponse.json({ error: 'Nenhum número de telefone encontrado na WABA. Configure um número no WhatsApp Business Manager.' }, { status: 400 })
                }

                if (phones.length === 1) {
                    // Se há apenas um número, usar diretamente
                    primaryPhone = phones[0]
                } else {
                    // Múltiplos números — erro para o usuário especificar qual conectar
                    console.warn('[ClaimWaba] WABA tem múltiplos números, phoneNumberId obrigatório')
                    return NextResponse.json({
                        error: `WABA tem ${phones.length} números. Especifique qual deseja conectar.`,
                        phones: phones.map((p: any) => ({ id: p.id, displayPhoneNumber: p.display_phone_number }))
                    }, { status: 400 })
                }
            } catch (err: any) {
                console.warn('[ClaimWaba] Erro ao buscar phones:', err.message)
                return NextResponse.json({ error: 'Erro ao buscar números de telefone da WABA: ' + err.message }, { status: 502 })
            }
        }

        if (!primaryPhone) {
            console.warn('[ClaimWaba] No phone numbers found yet for WABA:', wabaId)
        }

        // 4. Encrypt access token before storage
        const tokenToStore = clientAccessToken ? encryptToken(clientAccessToken) : null
        const isEncrypted = !!tokenToStore

        // 5. Criar ou atualizar a configuração no banco
        console.log('[ClaimWaba] Upserting config in DB...')
        const config = await prisma.whatsAppConfig.upsert({
            where: {
                phoneId: primaryPhone?.id || `pending_${wabaId}`
            },
            update: {
                projectId,
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
                projectId,
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
