import { prisma } from '@/lib/db/prisma'
import { resolveAccessToken } from '@/lib/whatsapp/token-crypto'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'
import {
  assertWhatsAppAllowedForProject,
  syncOrganizationSubscriptionItems,
} from '@/services/billing/billing-subscription.service'

const PENDING_PHONE_ID_PREFIX = 'pending_'

type WhatsAppPhoneNumberWithConfig = {
  id: string
  configId: string | null
  projectId: string | null
  projectName: string | null
  verified_name: string
  display_phone_number: string
  status: 'CONNECTED' | 'DISCONNECTED' | 'FLAGGED' | 'MIGRATED' | 'PENDING' | 'RESTRICTED'
  webhook_configuration?: {
    application: string
    whatsapp_business_account: string
  }
}

function isPendingPhoneId(phoneId: string | null | undefined): phoneId is string {
  return typeof phoneId === 'string' && phoneId.startsWith(PENDING_PHONE_ID_PREFIX)
}

function buildPendingPhonePlaceholder(config: {
  phoneId: string | null
  wabaId: string | null
  verifiedName: string | null
  displayPhone: string | null
}) {
  return {
    id: config.phoneId || `${PENDING_PHONE_ID_PREFIX}${config.wabaId || 'unknown'}`,
    verified_name: config.verifiedName || 'WhatsApp Business',
    display_phone_number: config.displayPhone || 'Número em configuração',
    quality_rating: 'UNKNOWN' as const,
    code_verification_status: 'NOT_VERIFIED' as const,
    platform_type: 'CLOUD_API' as const,
    throughput: {
      level: 'STANDARD' as const,
    },
    webhook_configuration: {
      application: 'WhaTrack',
      whatsapp_business_account: config.wabaId || '',
    },
    name_status: 'PENDING_REVIEW' as const,
    new_name_status: 'PENDING_REVIEW' as const,
    status: 'PENDING' as const,
    account_mode: 'LIVE' as const,
    wabaId: config.wabaId,
  }
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
        // Deregister this specific phone number from Cloud API
        if (config.phoneId) {
          try {
            await MetaCloudService.deregisterPhone({ phoneId: config.phoneId, accessToken: plainToken })
          } catch {
            // non-blocking
          }
        }

        // Only unsubscribe from WABA if there are no other active configs for it
        const otherActiveConfigs = await prisma.whatsAppConfig.count({
          where: {
            organizationId: params.organizationId,
            wabaId: config.wabaId,
            id: { not: params.configId },
            status: { not: 'disconnected' },
          },
        })

        if (otherActiveConfigs === 0) {
          await MetaCloudService.unsubscribeFromWaba(config.wabaId, plainToken)
        }
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

  await syncOrganizationSubscriptionItems(params.organizationId)

  return { success: true as const }
}

export async function listWhatsAppInstances(organizationId: string, projectId: string) {
  const phoneNumbersResponse = await listWhatsAppPhoneNumbers(organizationId)
  const phoneNumbers = phoneNumbersResponse.data.phoneNumbers as WhatsAppPhoneNumberWithConfig[]

  // Check which configs are still active (not disconnected)
  const configs = await MetaCloudService.getAllConfigs(organizationId)
  const activeConfigIds = new Set(
    configs
      .filter((config) => config.status === 'connected')
      .map((config) => config.id)
  )

  const instances = phoneNumbers
    .filter((phone) => {
      return (
        phone.projectId === projectId &&
        phone.status === 'CONNECTED' &&
        typeof phone.configId === 'string' &&
        phone.configId.length > 0 &&
        activeConfigIds.has(phone.configId) // Only include if config is still active in DB
      )
    })
    .sort((a, b) => a.display_phone_number.localeCompare(b.display_phone_number, 'pt-BR'))

  return {
    items: instances.map((instance) => ({
      id: instance.configId!,
      metaPhoneId: instance.id,
      displayPhone: instance.display_phone_number || 'Número não disponível',
      verifiedName: instance.verified_name || 'Sem nome verificado',
      status: instance.status,
      qualityRating: (instance as any).quality_rating ?? 'UNKNOWN',
      accountMode: (instance as any).account_mode ?? 'LIVE',
      throughputLevel: (instance as any).throughput?.level ?? 'STANDARD',
      wabaId:
        typeof instance.webhook_configuration?.whatsapp_business_account === 'string'
          ? instance.webhook_configuration.whatsapp_business_account
          : null,
      projectId: instance.projectId,
      projectName: instance.projectName ?? null,
    })),
  }
}

export async function listWhatsAppPhoneNumbers(organizationId: string) {
  const configs = await MetaCloudService.getAllConfigs(organizationId)
  const configByPhoneId = new Map(
    configs
      .filter((config) => config.phoneId && !isPendingPhoneId(config.phoneId) && config.status !== 'disconnected')
      .map((config) => [
        config.phoneId!,
        {
          configId: config.id,
          projectId: config.projectId,
          projectName: config.project?.name ?? null,
        },
      ]),
  )
  const pendingConfigByWabaId = new Map(
    configs
      .filter((config) => config.wabaId && isPendingPhoneId(config.phoneId) && config.status !== 'disconnected')
      .map((config) => [
        config.wabaId!,
        {
          configId: config.id,
          projectId: config.projectId,
          projectName: config.project?.name ?? null,
          phoneId: config.phoneId,
          wabaId: config.wabaId,
          verifiedName: config.verifiedName,
          displayPhone: config.displayPhone,
        },
      ]),
  )

  if (configs.length === 0) {
    return {
      data: {
        phoneNumbers: [],
        configured: false,
        message: 'Nenhuma instância WhatsApp configurada. Conecte sua conta para começar.',
      },
    }
  }

  const wabaIds = Array.from(new Set(configs.filter((c) => c.status !== 'disconnected').map((config) => config.wabaId).filter(Boolean))) as string[]
  const allPhoneNumbers: Array<Record<string, unknown>> = []

  for (const wabaId of wabaIds) {
    try {
      const wabaConfig = configs.find((config) => config.wabaId === wabaId)
      const token = wabaConfig ? resolveAccessToken(wabaConfig.accessToken) : undefined
      const numbers = await MetaCloudService.listPhoneNumbers({
        wabaId,
        accessToken: token || undefined,
      })

      if (numbers.length === 0) {
        const pendingConfig = pendingConfigByWabaId.get(wabaId)
        if (pendingConfig) {
          allPhoneNumbers.push(buildPendingPhonePlaceholder(pendingConfig))
        }
        continue
      }

      allPhoneNumbers.push(
        ...numbers.map((phone: Record<string, unknown>) => ({ ...phone, wabaId })),
      )
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
  const assignedPendingConfigIds = new Set<string>()

  return {
    data: {
      phoneNumbers: Object.values(uniqueById).map((phone) => {
        const id = typeof phone.id === 'string' ? phone.id : ''
        const wabaId = typeof phone.wabaId === 'string' ? phone.wabaId : ''
        const directConfig = configByPhoneId.get(id)
        const pendingConfig = wabaId ? pendingConfigByWabaId.get(wabaId) : undefined
        let config = directConfig

        if (!config && pendingConfig && !assignedPendingConfigIds.has(pendingConfig.configId)) {
          assignedPendingConfigIds.add(pendingConfig.configId)
          config = pendingConfig
        }

        const { wabaId: _, ...phoneData } = phone

        return {
          ...phoneData,
          configId: config?.configId ?? null,
          projectId: config?.projectId ?? null,
          projectName: config?.projectName ?? null,
        }
      }),
    },
  }
}

export async function assignWhatsAppConfigProject(input: {
  organizationId: string
  configId: string
  projectId: string | null
}) {
  // Phase 6: projectId is now NOT NULL - require a valid project
  if (!input.projectId) {
    return { error: 'projectId é obrigatório' as const, status: 400 as const }
  }

  const config = await prisma.whatsAppConfig.findFirst({
    where: {
      id: input.configId,
      organizationId: input.organizationId,
    },
    select: { id: true },
  })

  if (!config) {
    return { error: 'Instância não encontrada' as const, status: 404 as const }
  }

  await assertWhatsAppAllowedForProject({
    organizationId: input.organizationId,
    projectId: input.projectId,
  })

  const project = await prisma.project.findFirst({
    where: {
      id: input.projectId,
      organizationId: input.organizationId,
    },
    select: { id: true },
  })

  if (!project) {
    return { error: 'Projeto não encontrado' as const, status: 404 as const }
  }

  const updated = await prisma.whatsAppConfig.update({
    where: { id: input.configId },
    data: { projectId: input.projectId },
  })

  await syncOrganizationSubscriptionItems(input.organizationId)

  return { data: updated }
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
