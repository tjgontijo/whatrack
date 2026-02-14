import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { headers } from 'next/headers'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/whatsapp/check-connection
 * Verifica se a organização já possui uma configuração de WhatsApp no banco de dados.
 * Este endpoint é chamado manualmente após o usuário completar o fluxo de Embedded Signup da Meta.
 */
export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })

        if (!session?.session?.activeOrganizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const afterTimestamp = searchParams.get('after')

        const orgId = session.session.activeOrganizationId

        // Verifica se já existe uma configuração no banco
        const config: any = await MetaCloudService.getConfig(orgId)

        if (config && config.wabaId && config.phoneId) {
            // Se foi solicitado filtrar por data (polling de nova conexão)
            if (afterTimestamp) {
                const configUpdatedAt = new Date(config.updatedAt).getTime()
                const threshold = parseInt(afterTimestamp)

                // Se a configuração for mais antiga que o início do processo, ignoramos
                // (consideramos que ainda não houve atualização via webhook)
                if (configUpdatedAt < threshold) {
                    return NextResponse.json({
                        connected: false,
                        message: 'Aguardando atualização da configuração...'
                    })
                }
            }

            return NextResponse.json({
                connected: true,
                config: {
                    wabaId: config.wabaId,
                    phoneId: config.phoneId,
                    status: config.status
                }
            })
        }

        // Se não existir, por enquanto retornamos connected: false.
        // TODO: Implementar lógica para buscar WABAs compartilhados na Meta Graph API
        // e cadastrar automaticamente se encontrar um novo vínculo.

        return NextResponse.json({
            connected: false,
            message: 'Nenhuma conexão detectada ainda. Certifique-se de concluir o processo na Meta.'
        })

    } catch (error: any) {
        console.error('[API] Check Connection Error:', error)
        return NextResponse.json(
            { error: error.message || 'Falha ao verificar conexão' },
            { status: 500 }
        )
    }
}
