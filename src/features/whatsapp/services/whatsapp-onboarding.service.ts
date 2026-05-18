import "server-only"
import { MetaCloudService } from '@/features/whatsapp/services/meta-cloud.service'
import { prisma } from '@/lib/db/prisma'
import { encryption } from '@/lib/utils/encryption'
import { logger } from '@/lib/utils/logger'

interface CreateOnboardingSessionResult {
  onboardingUrl: string
  trackingCode: string
  expiresIn: number
}

const PENDING_PHONE_ID_PREFIX = 'pending_'

function buildPendingPhoneId(wabaId: string): string {
  return `${PENDING_PHONE_ID_PREFIX}${wabaId}`
}

export async function createWhatsAppOnboardingSession(
  organizationId: string,
  projectId: string,
  baseUrl?: string
): Promise<CreateOnboardingSessionResult | { error: string }> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const onboarding = await prisma.whatsAppOnboarding.create({
    data: {
      organizationId,
      projectId,
      expiresAt,
      status: 'pending',
    },
    select: { trackingCode: true },
  })

  const trackingCode = onboarding.trackingCode

  const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID
  const metaConfigId = process.env.NEXT_PUBLIC_META_CONFIG_ID
  const appUrl = baseUrl || process.env.APP_URL

  if (!metaAppId || !metaConfigId || !appUrl) {
    return {
      error:
        'Missing required env vars: NEXT_PUBLIC_META_APP_ID, NEXT_PUBLIC_META_CONFIG_ID, APP_URL',
    }
  }

  const onboardingUrl = new URL('https://www.facebook.com/dialog/oauth')
  onboardingUrl.searchParams.set('client_id', metaAppId)
  onboardingUrl.searchParams.set('redirect_uri', `${appUrl}/api/v1/whatsapp/onboarding/callback`)
  onboardingUrl.searchParams.set('state', trackingCode)
  onboardingUrl.searchParams.set(
    'scope',
    'whatsapp_business_messaging,whatsapp_business_management,business_management'
  )
  onboardingUrl.searchParams.set('response_type', 'code')
  onboardingUrl.searchParams.set('config_id', metaConfigId)

  return {
    onboardingUrl: onboardingUrl.toString(),
    trackingCode,
    expiresIn: 86400,
  }
}

interface HandleOnboardingCallbackInput {
  code: string | null
  state: string | null
  error: string | null
  errorDescription: string | null
}

type HandleOnboardingCallbackResult =
  | { success: true; totalPhones: number }
  | { success: false; message: string }

async function markOnboardingFailed(
  onboardingId: string,
  message: string,
  errorCode?: string | null
): Promise<void> {
  await prisma.whatsAppOnboarding.update({
    where: { id: onboardingId },
    data: {
      status: 'failed',
      errorMessage: message,
      errorCode: errorCode ?? undefined,
    },
  })
}

/**
 * Creates WhatsAppConfig for the specific phone the user connected.
 * Called by whoever arrives last in the Meet in the Middle pattern:
 * - OAuth callback (has accessToken) if postMessage (has phoneNumberId+wabaId) arrived first
 * - /phone-number endpoint (has phoneNumberId+wabaId) if OAuth callback arrived first
 */
export async function createWhatsAppConfigFromOnboarding(
  onboarding: {
    organizationId: string
    projectId: string
    phoneNumberId: string | null
    wabaId: string | null
  },
  accessToken: string
): Promise<boolean> {
  const { organizationId, projectId, phoneNumberId, wabaId } = onboarding
  if (!phoneNumberId || !wabaId) return false

  try {
    const connection = await prisma.whatsAppConnection.findFirst({
      where: { organizationId, wabaId },
    })

    const phones = await MetaCloudService.listPhoneNumbers({ wabaId, accessToken })
    const phone = phones.find((p: any) => p.id === phoneNumberId)

    if (!phone) {
      logger.warn({ phoneNumberId, wabaId }, '[Onboarding] Phone not found in WABA')
      return false
    }

    const encryptedToken = encryption.encrypt(accessToken)

    await prisma.whatsAppConfig.upsert({
      where: { phoneId: phoneNumberId },
      create: {
        organizationId,
        projectId,
        connectionId: connection?.id ?? null,
        wabaId,
        phoneId: phoneNumberId,
        displayPhone: phone.display_phone_number || 'Unknown',
        verifiedName: phone.verified_name || 'WhatsApp Business',
        accessToken: encryptedToken,
        accessTokenEncrypted: true,
        status: 'connected',
        connectedAt: new Date(),
      },
      update: {
        organizationId,
        projectId,
        connectionId: connection?.id ?? null,
        wabaId,
        displayPhone: phone.display_phone_number || 'Unknown',
        verifiedName: phone.verified_name || 'WhatsApp Business',
        accessToken: encryptedToken,
        accessTokenEncrypted: true,
        status: 'connected',
        connectedAt: new Date(),
        disconnectedAt: null,
      },
    })

    logger.info({ phoneNumberId }, '[Onboarding] ✅ WhatsAppConfig created')
    return true
  } catch (err) {
    logger.error({ err, phoneNumberId }, '[Onboarding] Error creating WhatsAppConfig')
    return false
  }
}

export async function handleWhatsAppOnboardingCallback(
  input: HandleOnboardingCallbackInput,
  baseUrl?: string | null
): Promise<HandleOnboardingCallbackResult> {
  if (input.error) {
    const message = `${input.error}: ${input.errorDescription || 'Unknown error'}`

    if (input.state) {
      await prisma.whatsAppOnboarding.updateMany({
        where: { trackingCode: input.state },
        data: {
          status: 'failed',
          errorMessage: message,
          errorCode: input.error,
        },
      })
    }

    return { success: false, message }
  }

  if (!input.code || !input.state) {
    return { success: false, message: 'Missing code or state in callback' }
  }

  const onboarding = await prisma.whatsAppOnboarding.findUnique({
    where: { trackingCode: input.state },
  })

  if (!onboarding) {
    return { success: false, message: 'Invalid or expired tracking code' }
  }

  if (onboarding.expiresAt < new Date()) {
    await prisma.whatsAppOnboarding.update({
      where: { id: onboarding.id },
      data: { status: 'expired' },
    })

    return { success: false, message: 'Tracking code expired' }
  }

  let accessToken = ''
  try {
    // null = JS SDK flow (omit redirect_uri), undefined/string = server-side redirect flow
    const redirectUri =
      baseUrl === null
        ? null
        : baseUrl
          ? `${baseUrl}/api/v1/whatsapp/onboarding/callback`
          : undefined
    const tokenData = await MetaCloudService.exchangeCodeForToken(input.code, redirectUri)
    accessToken = tokenData.access_token
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token exchange failed'
    await markOnboardingFailed(onboarding.id, message)
    return { success: false, message }
  }

  // List WABAs — create WABA-level connections (no phone configs here)
  let wabas: Array<{ wabaId: string; wabaName: string; businessId: string }> = []
  try {
    wabas = await MetaCloudService.listWabas(accessToken)
  } catch (error) {
    logger.warn({ error }, '[Onboarding] Failed to list WABAs')
  }

  logger.info(
    { wabaCount: wabas.length, organizationId: onboarding.organizationId },
    '[Onboarding] Processing WABAs (connections only — no phone configs yet)'
  )

  for (const waba of wabas) {
    try {
      await prisma.whatsAppConnection.upsert({
        where: {
          organizationId_wabaId: {
            organizationId: onboarding.organizationId,
            wabaId: waba.wabaId,
          },
        },
        create: {
          organizationId: onboarding.organizationId,
          projectId: onboarding.projectId,
          wabaId: waba.wabaId,
          ownerBusinessId: waba.businessId,
          status: 'active',
          connectedAt: new Date(),
          healthStatus: 'healthy',
        },
        update: {
          ownerBusinessId: waba.businessId,
          status: 'active',
          connectedAt: new Date(),
          healthStatus: 'healthy',
          disconnectedAt: null,
        },
      })

      // Subscribe to WABA webhooks
      try {
        await MetaCloudService.subscribeToWaba(waba.wabaId, accessToken)
      } catch {
        // non-blocking
      }

      // Clean up pending placeholders
      await prisma.whatsAppConfig
        .deleteMany({
          where: {
            organizationId: onboarding.organizationId,
            wabaId: waba.wabaId,
            phoneId: buildPendingPhoneId(waba.wabaId),
          },
        })
        .catch(() => {})
    } catch {
      // continue with other WABAs
    }
  }

  const encryptedToken = encryption.encrypt(accessToken)

  // Meet in the Middle: store token, then check if postMessage already arrived with phoneNumberId
  const updatedOnboarding = await prisma.whatsAppOnboarding.update({
    where: { id: onboarding.id },
    data: {
      accessToken: encryptedToken,
      status: 'completed',
      completedAt: new Date(),
      // Set wabaId/businessId only if not already set by postMessage or PARTNER_ADDED webhook
      ...(!onboarding.wabaId && wabas[0]
        ? {
            wabaId: wabas[0].wabaId,
            ownerBusinessId: wabas[0].businessId,
          }
        : {}),
    },
  })

  logger.info(
    {
      phoneNumberId: updatedOnboarding.phoneNumberId,
      wabaId: updatedOnboarding.wabaId,
      hasToken: true,
    },
    '[Onboarding] Token stored — checking Meet in the Middle condition'
  )

  // If postMessage already set phoneNumberId + wabaId, we are the last to arrive — create config
  if (updatedOnboarding.phoneNumberId && updatedOnboarding.wabaId) {
    logger.info(
      { phoneNumberId: updatedOnboarding.phoneNumberId },
      '[Onboarding] OAuth arrived last — creating WhatsAppConfig now'
    )

    const created = await createWhatsAppConfigFromOnboarding(updatedOnboarding, accessToken)

    await prisma.whatsAppAuditLog
      .create({
        data: {
          organizationId: onboarding.organizationId,
          action: 'ONBOARDING_COMPLETED',
          description: `WhatsApp connected: phone ${updatedOnboarding.phoneNumberId}`,
          trackingCode: input.state,
          metadata: {
            phoneNumberId: updatedOnboarding.phoneNumberId,
            wabaId: updatedOnboarding.wabaId,
          },
        },
      })
      .catch(() => {})

    return { success: true, totalPhones: created ? 1 : 0 }
  }

  // postMessage hasn't arrived yet — it will create the config when it arrives
  logger.info('[Onboarding] postMessage arrived last — waiting for phoneNumberId')
  return { success: true, totalPhones: 0 }
}
