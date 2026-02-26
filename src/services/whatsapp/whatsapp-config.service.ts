import { prisma } from '@/lib/db/prisma'
import { encryptToken, resolveAccessToken } from '@/lib/whatsapp/token-crypto'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'

interface ClaimWabaParams {
  organizationId: string
  wabaId: string
  code: string
  phoneNumberId?: string
}

type MetaPhoneNumber = {
  id?: string
  verified_name?: string
  display_phone_number?: string
}

export async function claimWhatsAppWaba(params: ClaimWabaParams) {
  const tokenData = await MetaCloudService.exchangeCodeForToken(params.code)
  const clientAccessToken = tokenData.access_token
  const tokenExpiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null

  let primaryPhone: MetaPhoneNumber | null = null

  if (params.phoneNumberId) {
    try {
      const phones = await MetaCloudService.listPhoneNumbers({
        wabaId: params.wabaId,
        accessToken: clientAccessToken,
      })

      primaryPhone =
        phones.find((phone: MetaPhoneNumber) => phone.id === params.phoneNumberId) ||
        phones[0] ||
        null
    } catch {
      primaryPhone = { id: params.phoneNumberId }
    }
  } else {
    try {
      const phones = await MetaCloudService.listPhoneNumbers({
        wabaId: params.wabaId,
        accessToken: clientAccessToken,
      })

      primaryPhone = phones[0] || null
    } catch {
      primaryPhone = null
    }
  }

  const encryptedAccessToken = encryptToken(clientAccessToken)

  const config = await prisma.whatsAppConfig.upsert({
    where: {
      phoneId: primaryPhone?.id || `pending_${params.wabaId}`,
    },
    update: {
      wabaId: params.wabaId,
      accessToken: encryptedAccessToken,
      accessTokenEncrypted: true,
      tokenExpiresAt,
      authorizationCode: params.code,
      status: 'connected',
      verifiedName: primaryPhone?.verified_name,
      displayPhone: primaryPhone?.display_phone_number,
      connectedAt: new Date(),
      disconnectedAt: null,
      disconnectedBy: null,
      tokenStatus: 'valid',
      updatedAt: new Date(),
    },
    create: {
      organizationId: params.organizationId,
      wabaId: params.wabaId,
      phoneId: primaryPhone?.id,
      accessToken: encryptedAccessToken,
      accessTokenEncrypted: true,
      tokenExpiresAt,
      authorizationCode: params.code,
      status: 'connected',
      verifiedName: primaryPhone?.verified_name,
      displayPhone: primaryPhone?.display_phone_number,
      connectedAt: new Date(),
      tokenStatus: 'valid',
    },
  })

  try {
    await MetaCloudService.subscribeToWaba(params.wabaId, clientAccessToken)
  } catch {
    // non-blocking
  }

  return config
}

interface DisconnectWhatsAppConfigParams {
  organizationId: string
  userId?: string | null
  configId: string
}

export async function disconnectWhatsAppConfig(params: DisconnectWhatsAppConfigParams) {
  const config = await prisma.whatsAppConfig.findFirst({
    where: {
      id: params.configId,
      organizationId: params.organizationId,
    },
  })

  if (!config) {
    return { error: 'Configuration not found' as const, status: 404 as const }
  }

  if (config.status === 'disconnected') {
    return { error: 'Already disconnected' as const, status: 400 as const }
  }

  if (config.wabaId && config.accessToken) {
    try {
      const plainToken = resolveAccessToken(config.accessToken)
      if (plainToken) {
        await MetaCloudService.unsubscribeFromWaba(config.wabaId, plainToken)
      }
    } catch {
      // non-blocking
    }
  }

  await prisma.whatsAppConfig.update({
    where: { id: params.configId },
    data: {
      status: 'disconnected',
      accessToken: null,
      accessTokenEncrypted: false,
      tokenStatus: null,
      disconnectedAt: new Date(),
      disconnectedBy: params.userId || null,
    },
  })

  return { success: true as const }
}

export async function listWhatsAppInstances(organizationId: string) {
  const instances = await prisma.whatsAppConfig.findMany({
    where: {
      organizationId,
      status: 'connected',
    },
    select: {
      id: true,
      displayPhone: true,
      verifiedName: true,
      status: true,
      wabaId: true,
      lastWebhookAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return {
    items: instances.map((instance) => ({
      id: instance.id,
      displayPhone: instance.displayPhone || 'Número não disponível',
      verifiedName: instance.verifiedName || 'Sem nome verificado',
      status: instance.status,
      wabaId: instance.wabaId,
      lastWebhookAt: instance.lastWebhookAt?.toISOString() || null,
    })),
  }
}

export async function listWhatsAppPhoneNumbers(organizationId: string) {
  const configs = await MetaCloudService.getAllConfigs(organizationId)

  if (configs.length === 0) {
    return {
      data: {
        phoneNumbers: [],
        configured: false,
        message: 'Nenhuma instância WhatsApp configurada. Conecte sua conta para começar.',
      },
    }
  }

  const wabaIds = Array.from(new Set(configs.map((config) => config.wabaId).filter(Boolean))) as string[]
  const allPhoneNumbers: Array<Record<string, unknown>> = []

  for (const wabaId of wabaIds) {
    try {
      const wabaConfig = configs.find((config) => config.wabaId === wabaId)
      const token = wabaConfig ? resolveAccessToken(wabaConfig.accessToken) : undefined
      const numbers = await MetaCloudService.listPhoneNumbers({
        wabaId,
        accessToken: token || undefined,
      })

      allPhoneNumbers.push(...numbers)
    } catch {
      // ignore WABA-specific failures
    }
  }

  const uniqueById = allPhoneNumbers.reduce<Record<string, Record<string, unknown>>>((acc, phone) => {
    const id = typeof phone.id === 'string' ? phone.id : ''
    if (id) {
      acc[id] = phone
    }

    return acc
  }, {})

  return { data: { phoneNumbers: Object.values(uniqueById) } }
}

export async function checkWhatsAppTokenHealth(organizationId: string) {
  const configs = await MetaCloudService.getAllConfigs(organizationId)

  if (configs.length === 0) {
    return { error: 'No WhatsApp configs found for this organization' as const, status: 404 as const }
  }

  const results: Array<Record<string, unknown>> = []

  for (const config of configs) {
    const result: {
      id: string
      wabaId: string | null
      phoneId: string | null
      displayPhone: string | null
      currentStatus: string
      tokenStatus: string
      expiresAt: string | null
      scopes: string[]
      error: string | null
    } = {
      id: config.id,
      wabaId: config.wabaId,
      phoneId: config.phoneId,
      displayPhone: config.displayPhone,
      currentStatus: config.status,
      tokenStatus: 'unknown',
      expiresAt: null,
      scopes: [],
      error: null,
    }

    if (!config.accessToken) {
      result.tokenStatus = 'missing'
      result.error = 'No access token stored'
      results.push(result)
      continue
    }

    if (config.status === 'disconnected') {
      result.tokenStatus = 'disconnected'
      results.push(result)
      continue
    }

    try {
      const plainToken = resolveAccessToken(config.accessToken)
      if (!plainToken) {
        result.tokenStatus = 'decrypt_error'
        result.error = 'Failed to resolve access token'
        results.push(result)
        continue
      }

      const debugData = await MetaCloudService.debugToken(plainToken)

      if (debugData.error) {
        result.tokenStatus = 'invalid'
        result.error = debugData.error.message
      } else if (!debugData.is_valid) {
        result.tokenStatus = 'expired'
      } else {
        const expiresAt = debugData.expires_at
        const now = Math.floor(Date.now() / 1000)
        const sevenDays = 7 * 24 * 60 * 60

        if (expiresAt === 0) {
          result.tokenStatus = 'valid'
          result.expiresAt = 'never'
        } else if (expiresAt - now < sevenDays) {
          result.tokenStatus = 'expiring_soon'
          result.expiresAt = new Date(expiresAt * 1000).toISOString()
        } else {
          result.tokenStatus = 'valid'
          result.expiresAt = new Date(expiresAt * 1000).toISOString()
        }

        result.scopes = debugData.scopes || []
      }

      await prisma.whatsAppConfig.update({
        where: { id: config.id },
        data: {
          tokenStatus: result.tokenStatus,
          tokenLastCheckedAt: new Date(),
          tokenExpiresAt:
            result.expiresAt && result.expiresAt !== 'never' ? new Date(result.expiresAt) : null,
          ...(result.tokenStatus === 'expired' || result.tokenStatus === 'invalid'
            ? { status: 'disconnected' }
            : {}),
        },
      })
    } catch (error: unknown) {
      result.tokenStatus = 'check_failed'
      result.error = error instanceof Error ? error.message : 'Token check failed'
    }

    results.push(result)
  }

  return {
    data: {
      checked: results.length,
      results,
      checkedAt: new Date().toISOString(),
    },
  }
}
