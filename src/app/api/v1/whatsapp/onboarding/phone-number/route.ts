import { z } from 'zod'
import {
  findOnboardingByTrackingCode,
  updateOnboardingPhoneData,
} from '@/features/whatsapp/repositories/find-onboarding-by-tracking-code.repository'
import { createWhatsAppConfigFromOnboarding } from '@/features/whatsapp/services/whatsapp-onboarding.service'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { encryption } from '@/lib/utils/encryption'
import { logger } from '@/lib/utils/logger'

const PhoneNumberSchema = z.object({
  state: z.string().min(1, 'state is required'),
  phoneNumberId: z.string().min(1, 'phoneNumberId is required'),
  wabaId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = PhoneNumberSchema.safeParse(body)
    if (!validation.success) return apiError('Invalid request body', 400)

    const { state, phoneNumberId, wabaId } = validation.data

    logger.info(
      { state: state.substring(0, 10), phoneNumberId, wabaId },
      '[OnboardingPhoneNumber] Recording data from Embedded Signup postMessage'
    )

    const onboarding = await findOnboardingByTrackingCode(state)
    if (!onboarding) {
      logger.warn({ state: state.substring(0, 10) }, '[OnboardingPhoneNumber] No onboarding session found')
      return apiError('Onboarding session not found', 404)
    }

    const updatedOnboarding = await updateOnboardingPhoneData(state, { phoneNumberId, wabaId })

    logger.info(
      { phoneNumberId, wabaId, hasToken: !!updatedOnboarding.accessToken },
      '[OnboardingPhoneNumber] Checking Meet in the Middle condition'
    )

    if (updatedOnboarding.accessToken) {
      logger.info({ phoneNumberId }, '[OnboardingPhoneNumber] postMessage arrived last — creating WhatsAppConfig now')
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
