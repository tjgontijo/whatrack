import { prisma } from '@/lib/prisma'
import { getWuzapiConfig } from './config'
import { createAppBaseUrl } from '@/lib/tracking/url'

const DEFAULT_EVENTS = ['All']

type ProvisionWebhookParams = {
  organizationId: string
  instanceId: string
}

/**
 * Provisiona webhook para receber eventos de uma instancia WuzAPI
 *
 * Endpoint WuzAPI: POST /webhook
 * Header: token: {userToken}
 */
export async function provisionWuzapiWebhook({
  organizationId,
  instanceId,
}: ProvisionWebhookParams): Promise<void> {
  const instance = await prisma.whatsappInstance.findUnique({
    where: {
      organizationId_instanceId: {
        organizationId,
        instanceId,
      },
    },
  })

  if (!instance) {
    throw new Error('Instancia nao encontrada para provisionar webhook')
  }

  if (!instance.token) {
    throw new Error('Token da instancia nao encontrado para provisionar webhook')
  }

  // Cria (ou reaproveita) registro local
  const webhook = await prisma.instanceWebhook.upsert({
    where: {
      organizationId_instanceId_webhook: {
        organizationId,
        instanceId,
      },
    },
    update: {},
    create: {
      organizationId,
      instanceId,
      url: '',
    },
  })

  const { baseUrl } = getWuzapiConfig()
  const appBaseUrl = createAppBaseUrl()
  const url = `${appBaseUrl}/api/v1/whatsapp/webhook/${webhook.id}`

  const payload = {
    WebhookURL: url,
    Events: DEFAULT_EVENTS,
  }

  const response = await fetch(`${baseUrl}/webhook`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      token: instance.token,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Falha ao provisionar webhook: ${response.status} ${text}`)
  }

  // Atualiza URL no registro local
  await prisma.instanceWebhook.update({
    where: {
      organizationId_instanceId_webhook: {
        organizationId,
        instanceId,
      },
    },
    data: {
      url,
    },
  })
}
