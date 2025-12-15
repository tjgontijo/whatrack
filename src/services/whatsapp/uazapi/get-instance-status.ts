import { listWhatsappInstances } from './list-instances'

type GetInstanceStatusParams = {
    instanceId: string
    organizationId: string
}

/**
 * Obtém o status atual da instância direto do provedor UAZAPI
 * 
 * Conforme padrão documentado em uazapi.md:
 * - Endpoint: GET /instance/status
 * - Header: token (token da instância)
 * - Resposta: { status, device?, qr? }
 */
export async function getInstanceStatus({
    instanceId,
    organizationId,
}: GetInstanceStatusParams) {
    // Sem persistência: reaproveitamos a listagem do provedor e filtramos pelo ID
    const instances = await listWhatsappInstances(organizationId)
    const instance = instances.find((item) => item.id === instanceId)

    if (!instance) {
        throw new Error('Instância não encontrada no provedor')
    }

    return {
        id: instance.id,
        providerId: instance.id,
        instanceId: instance.id,
        name: instance.label,
        status: instance.status,
        qrcode: instance.qrcode ?? null,
        paircode: instance.paircode ?? null,
        lastDisconnect: null,
        lastDisconnectReason: null,
        checkedAt: new Date().toISOString(),
    }
}
