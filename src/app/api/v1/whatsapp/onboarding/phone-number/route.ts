import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { encryption } from '@/lib/utils/encryption'
import { createWhatsAppConfigFromOnboarding } from '@/features/whatsapp/services/whatsapp-onboarding.service'

const PhoneNumberSchema = z.object({
  state: z.string().min(1, 'state is required'),
  phoneNumberId: z.string().min(1, 'phoneNumberId is required'),
  wabaId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = PhoneNumberSchema.safeParse(body)

    if (!validation.success) {
      return apiError('Invalid request body', 400)
    }

    const { state, phoneNumberId, wabaId } = validation.data

    logger.info(
      { state: state.substring(0, 10), phoneNumberId, wabaId },
      '[OnboardingPhoneNumber] Recording data from Embedded Signup postMessage'
    )

    const onboarding = await prisma.whatsAppOnboarding.findUnique({
      where: { trackingCode: state },
    })

    if (!onboarding) {
      logger.warn(
        { state: state.substring(0, 10) },
        '[OnboardingPhoneNumber] No onboarding session found'
      )
      return apiError('Onboarding session not found', 404)
    }

    // Meet in the Middle: store phoneNumberId + wabaId
    const updatedOnboarding = await prisma.whatsAppOnboarding.update({
      where: { trackingCode: state },
      data: {
        phoneNumberId,
        ...(wabaId ? { wabaId } : {}),
      },
    })

    logger.info(
      { phoneNumberId, wabaId, hasToken: !!updatedOnboarding.accessToken },
      '[OnboardingPhoneNumber] Checking Meet in the Middle condition'
    )

    // If OAuth callback already arrived with token, we are the last — create config now
    if (updatedOnboarding.accessToken) {
      logger.info(
        { phoneNumberId },
        '[OnboardingPhoneNumber] postMessage arrived last — creating WhatsAppConfig now'
      )
      try {
        const plainToken = encryption.decrypt(updatedOnboarding.accessToken)
        await createWhatsAppConfigFromOnboarding(updatedOnboarding, plainToken)
      } catch (err) {
        logger.error({ err }, '[OnboardingPhoneNumber] Error creating config from stored token')
      }
    } else {
      logger.info('[OnboardingPhoneNumber] phoneNumberId stored — waiting for OAuth token')
    }

    return apiSuccess({ success: true })
  } catch (error) {
    logger.error({ err: error }, '[OnboardingPhoneNumber] Error')
    return apiError('Internal server error', 500, error)
  }
}
