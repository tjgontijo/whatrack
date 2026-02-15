import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import { resolveAccessToken } from '@/lib/whatsapp/token-crypto'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/whatsapp/token-health
 * Verifica a saúde dos access tokens de todas as configs da organização.
 * 
 * Para cada config, chama /debug_token na Meta Graph API para verificar:
 * - Se o token é válido
 * - Quando expira 
 * - Quais scopes possui
 * 
 * Atualiza os campos tokenStatus e tokenLastCheckedAt no banco.
 */
export async function GET(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })

        if (!session?.session?.activeOrganizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const orgId = session.session.activeOrganizationId
        const configs = await MetaCloudService.getAllConfigs(orgId)

        if (configs.length === 0) {
            return NextResponse.json({
                error: 'No WhatsApp configs found for this organization'
            }, { status: 404 })
        }

        const results = []

        for (const config of configs) {
            const result: any = {
                id: config.id,
                wabaId: config.wabaId,
                phoneId: config.phoneId,
                displayPhone: config.displayPhone,
                currentStatus: config.status,
                tokenStatus: 'unknown' as string,
                expiresAt: null as string | null,
                scopes: [] as string[],
                error: null as string | null,
            }

            // Skip configs without tokens
            if (!config.accessToken) {
                result.tokenStatus = 'missing'
                result.error = 'No access token stored'
                results.push(result)
                continue
            }

            // Skip disconnected configs
            if (config.status === 'disconnected') {
                result.tokenStatus = 'disconnected'
                results.push(result)
                continue
            }

            try {
                // Resolve (decrypt if needed) the token
                const plainToken = resolveAccessToken(config.accessToken)
                if (!plainToken) {
                    result.tokenStatus = 'decrypt_error'
                    result.error = 'Failed to resolve access token'
                    results.push(result)
                    continue
                }

                // Call Meta's debug_token endpoint
                const debugData = await MetaCloudService.debugToken(plainToken)

                if (debugData.error) {
                    result.tokenStatus = 'invalid'
                    result.error = debugData.error.message
                } else if (!debugData.is_valid) {
                    result.tokenStatus = 'expired'
                } else {
                    const expiresAt = debugData.expires_at
                    const now = Math.floor(Date.now() / 1000)
                    const sevenDays = 7 * 24 * 60 * 60

                    if (expiresAt === 0) {
                        // Token never expires (permanent/system user token)
                        result.tokenStatus = 'valid'
                        result.expiresAt = 'never'
                    } else if (expiresAt - now < sevenDays) {
                        result.tokenStatus = 'expiring_soon'
                        result.expiresAt = new Date(expiresAt * 1000).toISOString()
                    } else {
                        result.tokenStatus = 'valid'
                        result.expiresAt = new Date(expiresAt * 1000).toISOString()
                    }

                    result.scopes = debugData.scopes || []
                }

                // Update the config in the database
                await prisma.whatsAppConfig.update({
                    where: { id: config.id },
                    data: {
                        tokenStatus: result.tokenStatus,
                        tokenLastCheckedAt: new Date(),
                        tokenExpiresAt: result.expiresAt && result.expiresAt !== 'never'
                            ? new Date(result.expiresAt)
                            : null,
                        // If token is expired/invalid, update config status
                        ...(result.tokenStatus === 'expired' || result.tokenStatus === 'invalid'
                            ? { status: 'disconnected' }
                            : {}
                        ),
                    }
                })

            } catch (err: any) {
                result.tokenStatus = 'check_failed'
                result.error = err.message
                console.error(`[TokenHealth] Failed to check token for config ${config.id}:`, err.message)
            }

            results.push(result)
        }

        return NextResponse.json({
            checked: results.length,
            results,
            checkedAt: new Date().toISOString(),
        })

    } catch (error: any) {
        console.error('[API] Token Health Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to check token health' },
            { status: 500 }
        )
    }
}
