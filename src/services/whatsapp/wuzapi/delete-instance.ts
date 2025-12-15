import { prisma } from '@/lib/prisma'
import { getWuzapiConfig } from './config'

type DeleteWuzapiInstanceParams = {
  instanceId: string
  organizationId: string
}

/**
 * Deleta uma instancia do WuzAPI e do banco de dados
 *
 * Endpoint WuzAPI: DELETE /admin/users/{id}/full
 * Header: Authorization: {adminToken}
 */
export async function deleteWuzapiInstance({
  instanceId,
  organizationId,
}: DeleteWuzapiInstanceParams): Promise<void> {
  const instance = await prisma.whatsappInstance.findUnique({
    where: {
      organizationId_instanceId: {
        organizationId,
        instanceId,
      },
    },
  })

  if (!instance) {
    throw new Error('Instancia nao encontrada')
  }

  const { baseUrl, adminToken } = getWuzapiConfig()

  // 1. Deleta do WuzAPI
  try {
    const response = await fetch(`${baseUrl}/admin/users/${instanceId}/full`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: adminToken,
      },
    })

    if (!response.ok && response.status !== 404) {
      const text = await response.text().catch(() => '')
      console.error('[wuzapi] Falha ao deletar no provider:', response.status, text)
      // Continua para limpar banco local mesmo se falhar no provider
    }
  } catch (error) {
    console.error('[wuzapi] Erro ao deletar no provider:', error)
    // Continua para limpar banco local
  }

  // 2. Deleta webhooks associados
  await prisma.instanceWebhook.deleteMany({
    where: {
      organizationId,
      instanceId,
    },
  })

  // 3. Deleta instancia do banco
  await prisma.whatsappInstance.delete({
    where: {
      organizationId_instanceId: {
        organizationId,
        instanceId,
      },
    },
  })
}
