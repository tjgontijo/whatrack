import { prisma } from '@/lib/prisma'
import { getWuzapiConfig } from './config'

type CreateWuzapiInstanceParams = {
  organizationId: string
  name: string
  phone: string
}

/**
 * Cria uma nova instancia no WuzAPI e salva no banco de dados
 *
 * Endpoint WuzAPI: POST /admin/users
 * Header: Authorization: {adminToken}
 */
export async function createWuzapiInstance({
  organizationId,
  name,
  phone,
}: CreateWuzapiInstanceParams) {
  const { baseUrl, adminToken } = getWuzapiConfig()

  // Gera token unico para o usuario
  const userToken = crypto.randomUUID()

  const response = await fetch(`${baseUrl}/admin/users`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: adminToken,
    },
    body: JSON.stringify({
      name,
      token: userToken,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[wuzapi] Falha ao criar instancia:', response.status, text)
    throw new Error(`Falha ao criar instancia WuzAPI: ${response.status}`)
  }

  const payload = await response.json()
  const externalId = payload.data?.id || payload.id

  if (!externalId) {
    throw new Error('WuzAPI nao retornou ID da instancia')
  }

  // Salva no banco de dados
  const instance = await prisma.whatsappInstance.upsert({
    where: {
      organizationId_instanceId: {
        organizationId,
        instanceId: externalId,
      },
    },
    update: {
      label: name,
      phone,
      token: userToken,
    },
    create: {
      organizationId,
      instanceId: externalId,
      label: name,
      phone,
      token: userToken,
      provider: 'wuzapi',
    },
  })

  return instance
}
