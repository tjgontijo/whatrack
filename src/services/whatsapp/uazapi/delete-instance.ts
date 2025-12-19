import { prisma } from '@/lib/prisma'
import { getUazapiConfig } from './config'

type DeleteInstanceParams = {
    instanceId: string
    organizationId: string
}

/**
 * Remove a instância no provedor e apaga o registro local.
 * Contrato UAZAPI: DELETE /instance com header token (da instância).
 */
export async function deleteWhatsappInstance({ instanceId, organizationId }: DeleteInstanceParams) {
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

    // Endpoint: DELETE /instance usando token da instância
    const response = await fetch(`${baseUrl}/instance`, {
        method: 'DELETE',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            token: link.token,
        },
        body: JSON.stringify({ instanceId }),
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        console.warn(`[whatsapp] falha ao deletar na API: ${response.status} ${text}`)
    }

    // Remove webhook local (cascade evita órfãos, mas removemos explicitamente)
    await prisma.whatsappInstanceWebhook.deleteMany({
        where: {
            organizationId,
            instanceId,
        },
    })

    await prisma.whatsappInstance.delete({
        where: {
            organizationId_instanceId: {
                organizationId,
                instanceId,
            },
        },
    })
}
