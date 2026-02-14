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
        const { wabaId } = await request.json()

        if (!wabaId) {
            return NextResponse.json({ error: 'WABA ID is required' }, { status: 400 })
        }

        console.log(`[ClaimWaba] Request for WABA: ${wabaId}, Org: ${orgId}`)

        // 1. Buscar detalhes do WABA na Meta para confirmar que temos acesso
        // e pegar o primeiro número de telefone disponível
        const token = MetaCloudService.accessToken
        const phoneNumbersUrl = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v24.0'}/${wabaId}/phone_numbers`

        const response = await fetch(phoneNumbersUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('[ClaimWaba] Meta API error:', error)
            return NextResponse.json({ error: 'Failed to verify WABA with Meta' }, { status: 502 })
        }

        const data = await response.json()
        const phones = data.data || []

        if (phones.length === 0) {
            // Se ainda não tem número, salvamos apenas o WABA ID para o polling continuar
            // mas o ideal é que já tenha.
            console.warn('[ClaimWaba] No phone numbers found yet for WABA:', wabaId)
        }

        const primaryPhone = phones[0]

        // 2. Criar ou atualizar a configuração no banco
        const config = await prisma.whatsAppConfig.upsert({
            where: {
                phoneId: primaryPhone?.id || `pending_${wabaId}`
            },
            update: {
                wabaId,
                status: 'connected',
                verifiedName: primaryPhone?.verified_name,
                displayPhone: primaryPhone?.display_phone_number,
                updatedAt: new Date(),
            },
            create: {
                organizationId: orgId,
                wabaId,
                phoneId: primaryPhone?.id,
                status: 'connected',
                verifiedName: primaryPhone?.verified_name,
                displayPhone: primaryPhone?.display_phone_number,
            }
        })

        // 3. Tentar ativar o webhook (assinatura) automaticamente
        try {
            const subscribeUrl = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v24.0'}/${wabaId}/subscribed_apps`
            await fetch(subscribeUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
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
