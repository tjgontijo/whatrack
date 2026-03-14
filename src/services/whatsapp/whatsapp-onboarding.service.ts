import { createId } from '@paralleldrive/cuid2'

import { prisma } from '@/lib/db/prisma'
import { encryption } from '@/lib/utils/encryption'
import { MetaCloudService } from '@/services/whatsapp/meta-cloud.service'

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
  projectId?: string,
  baseUrl?: string
): Promise<CreateOnboardingSessionResult | { error: string }> {
  const trackingCode = createId()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.whatsAppOnboarding.create({
    data: {
      organizationId,
      projectId: projectId || null,
      trackingCode,
      expiresAt,
      status: 'pending',
    },
  })

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
  onboardingUrl.searchParams.set('scope', 'whatsapp_business_management,business_management')
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

export async function handleWhatsAppOnboardingCallback(
  input: HandleOnboardingCallbackInput,
  baseUrl?: string
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
    const redirectUri = baseUrl ? `${baseUrl}/api/v1/whatsapp/onboarding/callback` : undefined
    const tokenData = await MetaCloudService.exchangeCodeForToken(input.code, redirectUri)
    accessToken = tokenData.access_token
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token exchange failed'
    await markOnboardingFailed(onboarding.id, message)
    return { success: false, message }
  }

  let wabas: Array<{ wabaId: string; wabaName: string; businessId: string }> = []
  try {
    wabas = await MetaCloudService.listWabas(accessToken)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list WABAs'
    await markOnboardingFailed(onboarding.id, message)
    return { success: false, message }
  }

  if (wabas.length === 0) {
    const message = 'No WhatsApp Business Accounts found. Please complete the signup process.'
    await markOnboardingFailed(onboarding.id, message)
    return { success: false, message }
  }

  const encryptedToken = encryption.encrypt(accessToken)
  let totalPhones = 0

  for (const waba of wabas) {
    try {
      const connection = await prisma.whatsAppConnection.upsert({
        where: {
          organizationId_wabaId: {
            organizationId: onboarding.organizationId,
            wabaId: waba.wabaId,
          },
        },
        create: {
          organizationId: onboarding.organizationId,
          projectId: onboarding.projectId || null,
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

      let phones: Array<{
        id: string
        display_phone_number?: string
        verified_name?: string
      }> = []
      try {
        phones = await MetaCloudService.listPhoneNumbers({
          wabaId: waba.wabaId,
          accessToken,
        })
      } catch {
        phones = []
      }

      if (phones.length === 0) {
        const pendingPhoneId = buildPendingPhoneId(waba.wabaId)

        await prisma.whatsAppConfig.upsert({
          where: { phoneId: pendingPhoneId },
          create: {
            organizationId: onboarding.organizationId,
            projectId: onboarding.projectId || null,
            connectionId: connection.id,
            wabaId: waba.wabaId,
            phoneId: pendingPhoneId,
            displayPhone: 'Número em configuração',
            verifiedName: waba.wabaName,
            accessToken: encryptedToken,
            accessTokenEncrypted: true,
            status: 'pending',
            connectedAt: new Date(),
          },
          update: {
            organizationId: onboarding.organizationId,
            projectId: onboarding.projectId || null,
            connectionId: connection.id,
            wabaId: waba.wabaId,
            displayPhone: 'Número em configuração',
            verifiedName: waba.wabaName,
            accessToken: encryptedToken,
            accessTokenEncrypted: true,
            status: 'pending',
            connectedAt: new Date(),
            disconnectedAt: null,
          },
        })
      } else {
        await prisma.whatsAppConfig.deleteMany({
          where: {
            organizationId: onboarding.organizationId,
            wabaId: waba.wabaId,
            phoneId: buildPendingPhoneId(waba.wabaId),
          },
        })
      }

      for (const phone of phones) {
        await prisma.whatsAppConfig.upsert({
          where: { phoneId: phone.id },
          create: {
            organizationId: onboarding.organizationId,
            projectId: onboarding.projectId || null,
            connectionId: connection.id,
            wabaId: waba.wabaId,
            phoneId: phone.id,
            displayPhone: phone.display_phone_number,
            verifiedName: phone.verified_name,
            accessToken: encryptedToken,
            accessTokenEncrypted: true,
            status: 'connected',
            connectedAt: new Date(),
          },
          update: {
            organizationId: onboarding.organizationId,
            projectId: onboarding.projectId || null,
            connectionId: connection.id,
            displayPhone: phone.display_phone_number,
            verifiedName: phone.verified_name,
            accessToken: encryptedToken,
            accessTokenEncrypted: true,
            status: 'connected',
            connectedAt: new Date(),
            disconnectedAt: null,
          },
        })

        totalPhones++
      }

      try {
        await MetaCloudService.subscribeToWaba(waba.wabaId, accessToken)
      } catch {
        // non-blocking
      }

      await prisma.whatsAppAuditLog.create({
        data: {
          organizationId: onboarding.organizationId,
          connectionId: connection.id,
          action: 'ONBOARDING_COMPLETED',
          description: `WhatsApp connected: ${waba.wabaName} with ${phones.length} phone number(s)`,
          trackingCode: input.state,
          metadata: {
            wabaId: waba.wabaId,
            businessId: waba.businessId,
            phoneCount: phones.length,
          },
        },
      })
    } catch {
      // continue with other WABAs
    }
  }

  await prisma.whatsAppOnboarding.update({
    where: { id: onboarding.id },
    data: {
      status: 'completed',
      completedAt: new Date(),
      wabaId: wabas[0]?.wabaId,
      ownerBusinessId: wabas[0]?.businessId,
    },
  })

  return { success: true, totalPhones }
}
