import { prisma } from '@/lib/prisma'
import { getWuzapiConfig } from './config'

type LogoutWuzapiInstanceParams = {
  instanceId: string
  organizationId: string
}

/**
 * Desconecta uma instancia WuzAPI
 *
 * Endpoint WuzAPI: POST /session/logout
 * Header: token: {userToken}
 */
export async function logoutWuzapiInstance({
  instanceId,
  organizationId,
}: LogoutWuzapiInstanceParams): Promise<void> {
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

  if (!instance.token) {
    throw new Error('Token da instancia nao encontrado')
  }

  const { baseUrl } = getWuzapiConfig()

  const response = await fetch(`${baseUrl}/session/logout`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      token: instance.token,
    },
  })

  // Aceita sucesso mesmo se ja estava desconectado
  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => '')
    console.error('[wuzapi] Falha ao desconectar:', response.status, text)
    throw new Error(`Falha ao desconectar WuzAPI: ${response.status}`)
  }
}
