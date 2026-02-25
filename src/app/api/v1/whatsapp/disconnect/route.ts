import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { resolveAccessToken } from '@/lib/whatsapp/token-crypto'
import { validateFullAccess } from '@/server/auth/validate-organization-access'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/whatsapp/disconnect
 * Desconecta um WABA da organização de forma limpa.
 *
 * Passos:
 * 1. Remove assinatura de webhooks na Meta (DELETE /subscribed_apps)
 * 2. Atualiza status para "disconnected"
 * 3. Limpa o access token do banco
 * 4. Mantém o registro para histórico (soft delete)
 */
export async function POST(request: Request) {
  try {
    const access = await validateFullAccess(request)
    if (!access.hasAccess || !access.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = access.organizationId
    const userId = access.userId
    const { configId } = await request.json()

    if (!configId) {
      return NextResponse.json({ error: 'configId is required' }, { status: 400 })
    }

    // 1. Buscar a configuração e verificar que pertence à organização
    const config = await prisma.whatsAppConfig.findFirst({
      where: {
        id: configId,
        organizationId: orgId,
      },
    })

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 })
    }

    if (config.status === 'disconnected') {
      return NextResponse.json({ error: 'Already disconnected' }, { status: 400 })
    }

    console.log(`[Disconnect] Disconnecting config ${configId} for org ${orgId}`)

    // 2. Tentar remover assinatura de webhooks na Meta
    if (config.wabaId && config.accessToken) {
      try {
        const plainToken = resolveAccessToken(config.accessToken)
        if (plainToken) {
          await MetaCloudService.unsubscribeFromWaba(config.wabaId, plainToken)
          console.log('[Disconnect] Webhooks unsubscribed successfully')
        }
      } catch (err: any) {
        // Não bloqueia a desconexão — pode falhar se token já expirou
        console.warn('[Disconnect] Failed to unsubscribe webhooks (non-blocking):', err.message)
      }
    }

    // 3. Atualizar status no banco (soft delete)
    await prisma.whatsAppConfig.update({
      where: { id: configId },
      data: {
        status: 'disconnected',
        accessToken: null,
        accessTokenEncrypted: false,
        tokenStatus: null,
        disconnectedAt: new Date(),
        disconnectedBy: userId || null,
      },
    })

    console.log(`[Disconnect] Config ${configId} disconnected successfully`)

    return NextResponse.json({
      success: true,
      message: 'WhatsApp desconectado com sucesso',
    })
  } catch (error: any) {
    console.error('[API] Disconnect Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to disconnect' }, { status: 500 })
  }
}
