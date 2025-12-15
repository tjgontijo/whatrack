import { prisma } from '@/lib/prisma'
import { listWhatsappInstances } from './list-instances'

type GetInstanceParams = {
    instanceId: string
    organizationId: string
}

export async function getWhatsappInstance({ instanceId, organizationId }: GetInstanceParams) {
    const link = await prisma.whatsappInstance.findUnique({
        where: {
            organizationId_instanceId: {
                organizationId,
                instanceId,
            },
        },
    })

    if (!link) return null

    const instances = await listWhatsappInstances(organizationId)
    return instances
        .map((item) => ({
            ...item,
            instanceId: item.instanceId ?? item.id,
        }))
        .find((item) => item.id === instanceId || item.instanceId === instanceId) ?? null
}
