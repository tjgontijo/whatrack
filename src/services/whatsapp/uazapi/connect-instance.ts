import { prisma } from '@/lib/prisma'
import { getUazapiConfig } from './config'
import { provisionInstanceWebhook } from './provision-webhook'

type ConnectInstanceParams = {
    instanceId: string
    organizationId: string
    phone?: string  // Se fornecido, gera pair code. Caso contrário, gera QR code
}

/**
 * Conecta uma instância WhatsApp no provedor UAZAPI
 * 
 * Conforme padrão documentado em uazapi.md:
 * - Endpoint: POST /instance/connect
 * - Header: token (token da instância, não admintoken)
 * - Payload: { phone?: string }
 * - Resposta: { qr?, pairCode?, expiresAt? }
 */
export async function connectWhatsappInstance({
    instanceId,
    organizationId,
    phone
}: ConnectInstanceParams) {
    const link = await prisma.whatsappInstance.findUnique({
        where: {
            organizationId_instanceId: {
                organizationId,
                instanceId,
            },
        },
    })

    if (!link) {
        throw new Error('Instância não vinculada à organização')
    }

    if (!link.token) {
        throw new Error('Token da instância não encontrado')
    }

    const { baseUrl } = getUazapiConfig()

    // 2. Preparar payload
    const payload: { phone?: string } = phone ? { phone } : {}

    // 3. Chamar endpoint do provedor
    const response = await fetch(`${baseUrl}/instance/connect`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            token: link.token,
        },
        body: JSON.stringify(payload),
    })

    // Status 409 = tentativa de conexão em andamento (ainda retorna QR code)
    // Status 200 = sucesso
    if (!response.ok && response.status !== 409) {
        const errorText = await response.text()
        console.error('[connectWhatsappInstance] UAZAPI error', {
            status: response.status,
            body: errorText
        })
        throw new Error(`Falha ao conectar instância: ${response.status}`)
    }

    const responseData = await response.json()
    console.log('[connectWhatsappInstance] payload', JSON.stringify(responseData, null, 2))

    // 4. Extrair dados da resposta (suporta diferentes formatos)
    // A UAZAPI pode retornar o QR code em diferentes estruturas
    const instance_data = responseData.instance || responseData
    const qr = instance_data.qr || instance_data.qrcode || responseData.qrcode || null
    const pairCode = instance_data.pairCode || instance_data.paircode || responseData.paircode || null
    const expiresAt = responseData.expiresAt || null

    // Determinar status baseado no que foi retornado
    let status = 'connecting'
    if (pairCode) {
        status = 'waiting_pair'
    } else if (qr) {
        status = 'waiting_qr'
    }

    // Provisiona webhook automático (modo simples) - não bloqueia retorno se falhar
    provisionInstanceWebhook({ organizationId, instanceId }).catch((error) => {
        console.error('[connectWhatsappInstance] falha ao provisionar webhook', error)
    })

    // 5. Retornar resposta padronizada (sem persistir localmente)
    return {
        id: instanceId,
        instanceId,
        status,
        qr,
        pairCode,
        expiresAt,
    }
}
