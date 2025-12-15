import { prisma } from '@/lib/prisma'
import { getUazapiConfig } from './config'
import type { WhatsappInstance } from '@/lib/schema/whatsapp'

export type CreateWhatsappInstanceParams = {
  organizationId: string
  name: string
  phone: string
}

export async function createWhatsappInstance({
  organizationId,
  name,
  phone,
}: CreateWhatsappInstanceParams): Promise<WhatsappInstance> {
  const { baseUrl, adminToken } = getUazapiConfig()
  // Usar nome da aplicação configurado no .env (APP_NAME)
  const systemName = process.env.APP_NAME

  const requestBody = {
    name,
    systemName, // Identificador do sistema (não usar o número)
  }

  console.info('[whatsapp] criando instância', {
    organizationId,
    name,
    phone,
    baseUrl,
    systemName,
    tokenPreview: `${adminToken.slice(0, 4)}***`,
  })

  const response = await fetch(`${baseUrl}/instance/init`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      admintoken: adminToken,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    let details: string | undefined
    try {
      const errorPayload = await response.json()
      details = typeof errorPayload?.message === 'string' ? errorPayload.message : undefined
      console.error('[whatsapp] erro ao criar instância', errorPayload)
    } catch (parseError) {
      console.error('[whatsapp] falha ao ler erro da UAZApi', parseError)
    }

    throw new Error(`Falha ao criar instância: ${details ?? response.status}`)
  }

  const payload = (await response.json()) as InstanceConnectResponse
  const prepared = mapPayloadToInstance({
    payload,
    organizationId,
    name,
    phone,
  })

  await prisma.whatsappInstance.upsert({
    where: {
      organizationId_instanceId: {
        organizationId,
        instanceId: prepared.instanceId,
      },
    },
    update: {
      label: name,
      phone,
      token: prepared.token,
    },
    create: {
      organizationId,
      instanceId: prepared.instanceId,
      label: name,
      phone,
      token: prepared.token,
    },
  })

  return {
    id: prepared.instanceId,
    instanceId: prepared.instanceId,
    label: prepared.label,
    phone: prepared.phone,
    status: prepared.status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

type InstanceConnectResponse = {
  connected: boolean
  loggedIn: boolean
  jid: string | null
  instance: {
    id: string
    token: string
    status: string
  }
}

function mapPayloadToInstance({
  payload,
  organizationId,
  name,
  phone,
}: {
  payload: InstanceConnectResponse
  organizationId: string
  name: string
  phone: string
}) {
  const instance = payload.instance

  if (!instance?.id) {
    throw new Error('Resposta inválida da UAZApi - instance id ausente')
  }

  const normalizedStatus =
    instance.status === 'connected' || instance.status === 'open'
      ? 'connected'
      : 'disconnected'

  return {
    organizationId,
    instanceId: instance.id,
    label: name,
    phone,
    token: instance.token,
    status: normalizedStatus,
  }
}
