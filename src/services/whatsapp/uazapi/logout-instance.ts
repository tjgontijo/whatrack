import { prisma } from '@/lib/prisma'
import { getUazapiConfig } from './config'

type LogoutInstanceParams = {
    instanceId: string
    organizationId: string
}

export async function logoutWhatsappInstance({ instanceId, organizationId }: LogoutInstanceParams) {
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

    // Endpoint conforme documentação: POST /instance/disconnect com token da instância
    const response = await fetch(`${baseUrl}/instance/disconnect`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            token: link.token,
        },
        body: JSON.stringify({ instanceId }),
    })

    // Mesmo se a API falhar (ex: instância já desconectada), atualizamos o banco
    // Mas logamos o erro
    if (!response.ok) {
        console.warn(`[whatsapp] falha ao desconectar na API: ${response.status}`)
    }
}
