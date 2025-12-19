import { prisma } from '@/lib/prisma'
import { getUazapiConfig } from './config'
import { createAppBaseUrl } from '@/lib/tracking/url'

const DEFAULT_EVENTS = ['messages']

const DEFAULT_EXCLUDE = ['wasSentByApi']

/**
 * Garante a existência de um webhook para a instância (modo simples) e registra no provedor
 */
export async function provisionInstanceWebhook({
  organizationId,
  instanceId,
}: {
  organizationId: string
  instanceId: string
}) {
  const instance = await prisma.whatsappInstance.findUnique({
    where: {
      organizationId_instanceId: {
        organizationId,
        instanceId,
      },
    },
  })

  if (!instance) {
    throw new Error('Instância não encontrada para provisionar webhook')
  }

  if (!instance.token) {
    throw new Error('Token da instância não encontrado para provisionar webhook')
  }

  // Cria (ou reaproveita) registro local
  const webhook = await prisma.whatsappInstanceWebhook.upsert({
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

  const { baseUrl } = getUazapiConfig()
  const appBaseUrl = createAppBaseUrl()
  const url = `${appBaseUrl}/api/v1/whatsapp/instances/${instanceId}/webhook/${webhook.id}`

  const payload = {
    url,
    enabled: true,
    events: DEFAULT_EVENTS,
    excludeMessages: DEFAULT_EXCLUDE,
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

  const responseBody = await response.json().catch(() => null)
  const providerWebhookId =
    typeof responseBody?.id === 'string'
      ? responseBody.id
      : typeof responseBody?.webhookId === 'string'
        ? responseBody.webhookId
        : undefined

  await prisma.whatsappInstanceWebhook.update({
    where: {
      organizationId_instanceId_webhook: {
        organizationId,
        instanceId,
      },
    },
    data: {
      url,
      providerWebhookId,
    },
  })
}
