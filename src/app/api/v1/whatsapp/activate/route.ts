import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'

export const dynamic = 'force-dynamic'

const GRAPH_API_URL = 'https://graph.facebook.com'
const API_VERSION = process.env.META_API_VERSION || 'v24.0'

/**
 * POST /api/v1/whatsapp/activate
 * Ativa um número de telefone executando:
 * 1. POST /{phone_id}/register - Registra o número
 * 2. POST /{waba_id}/subscribed_apps - Assina o app para webhooks
 */
export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })

        if (!session?.session?.activeOrganizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const config = await MetaCloudService.getConfig(session.session.activeOrganizationId)

        if (!config || !config.phoneId || !config.wabaId || !config.accessToken) {
            return NextResponse.json({
                error: 'WhatsApp not configured for this organization'
            }, { status: 404 })
        }

        const results = {
            register: { success: false, data: null as any },
            subscribe: { success: false, data: null as any },
        }

        // PASSO 1: Registrar o número
        const registerUrl = `${GRAPH_API_URL}/${API_VERSION}/${config.phoneId}/register`
        console.log('[Activate] Registering phone:', registerUrl)

        try {
            const registerResponse = await fetch(registerUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    pin: '123456',
                }),
            })

            const registerData = await registerResponse.json()
            results.register = {
                success: registerResponse.ok,
                data: registerData
            }

            if (!registerResponse.ok) {
                console.error('[Activate] Register error:', registerData)
            }
        } catch (error: any) {
            console.error('[Activate] Register exception:', error.message)
            results.register.data = { error: error.message }
        }

        // PASSO 2: Assinar o App
        const subscribeUrl = `${GRAPH_API_URL}/${API_VERSION}/${config.wabaId}/subscribed_apps`
        console.log('[Activate] Subscribing app:', subscribeUrl)

        try {
            const subscribeResponse = await fetch(subscribeUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                },
            })

            const subscribeData = await subscribeResponse.json()
            results.subscribe = {
                success: subscribeResponse.ok,
                data: subscribeData
            }

            if (!subscribeResponse.ok) {
                console.error('[Activate] Subscribe error:', subscribeData)
            }
        } catch (error: any) {
            console.error('[Activate] Subscribe exception:', error.message)
            results.subscribe.data = { error: error.message }
        }

        const overallSuccess = results.register.success && results.subscribe.success

        return NextResponse.json({
            success: overallSuccess,
            message: overallSuccess
                ? 'Número ativado com sucesso!'
                : 'Ativação parcial. Verifique os detalhes.',
            results
        })

    } catch (error: any) {
        console.error('[API] Activate Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to activate number' },
            { status: 500 }
        )
    }
}
