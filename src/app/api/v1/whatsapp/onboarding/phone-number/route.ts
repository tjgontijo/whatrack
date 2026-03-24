import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'

const PhoneNumberSchema = z.object({
  state: z.string().min(1, 'state is required'),
  phoneNumberId: z.string().min(1, 'phoneNumberId is required'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = PhoneNumberSchema.safeParse(body)

    if (!validation.success) {
      return apiError('Invalid request body', 400)
    }

    const { state, phoneNumberId } = validation.data

    logger.info(
      { state: state.substring(0, 10), phoneNumberId },
      '[OnboardingPhoneNumber] 🔍 Recording phone_number_id from Embedded Signup'
    )

    // Update onboarding record with phone number ID captured from Meta's postMessage
    const updated = await prisma.whatsAppOnboarding.updateMany({
      where: { trackingCode: state },
      data: { phoneNumberId },
    })

    logger.info(
      { state: state.substring(0, 10), phoneNumberId, updatedCount: updated.count },
      '[OnboardingPhoneNumber] Update result'
    )

    if (updated.count === 0) {
      logger.warn(
        { state: state.substring(0, 10) },
        '[OnboardingPhoneNumber] ⚠️ No onboarding session found for this state'
      )
      return apiError('Onboarding session not found', 404)
    }

    logger.info(
      { state: state.substring(0, 10), phoneNumberId, updatedCount: updated.count },
      '[OnboardingPhoneNumber] ✅ Successfully recorded phone_number_id'
    )

    return apiSuccess({ success: true })
  } catch (error) {
    logger.error({ err: error }, '[OnboardingPhoneNumber] Error')
    return apiError('Internal server error', 500, error)
  }
}
