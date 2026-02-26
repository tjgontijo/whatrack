import { NextResponse } from 'next/server'
import { apiError } from '@/lib/utils/api-response'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

const GRAPH_API_URL = 'https://graph.facebook.com'
const API_VERSION = process.env.META_API_VERSION

interface ActivateStepResult {
  success: boolean
  data: unknown
}

/**
 * POST /api/v1/whatsapp/activate
 * Ativa um número de telefone executando:
 * 1. POST /{phone_id}/register - Registra o número
 * 2. POST /{waba_id}/subscribed_apps - Assina o app para webhooks
 */
export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return apiError('Unauthorized', 401)
    }

    const config = await MetaCloudService.getConfig(access.organizationId)

    if (!config || !config.phoneId || !config.wabaId) {
      return apiError('WhatsApp not configured for this organization', 404)
    }

    const token = MetaCloudService.accessToken
    const results = {
      register: { success: false, data: null } as ActivateStepResult,
      subscribe: { success: false, data: null } as ActivateStepResult,
    }

    // PASSO 1: Registrar o número
    const registerUrl = `${GRAPH_API_URL}/${API_VERSION}/${config.phoneId}/register`
    console.log('[Activate] Registering phone:', registerUrl)

    try {
      const registerResponse = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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
        data: registerData,
      }

      if (!registerResponse.ok) {
        console.error('[Activate] Register error:', registerData)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Activate] Register exception:', message)
      results.register.data = { error: message }
    }

    // PASSO 2: Assinar o App
    const subscribeUrl = `${GRAPH_API_URL}/${API_VERSION}/${config.wabaId}/subscribed_apps`
    console.log('[Activate] Subscribing app:', subscribeUrl)

    try {
      const subscribeResponse = await fetch(subscribeUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const subscribeData = await subscribeResponse.json()
      results.subscribe = {
        success: subscribeResponse.ok,
        data: subscribeData,
      }

      if (!subscribeResponse.ok) {
        console.error('[Activate] Subscribe error:', subscribeData)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Activate] Subscribe exception:', message)
      results.subscribe.data = { error: message }
    }

    const overallSuccess = results.register.success && results.subscribe.success

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess
        ? 'Número ativado com sucesso!'
        : 'Ativação parcial. Verifique os detalhes.',
      results,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to activate number'
    console.error('[API] Activate Error:', error)
    return apiError(message, 500, error)
  }
}
