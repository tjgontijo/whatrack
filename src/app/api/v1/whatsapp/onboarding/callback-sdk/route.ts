import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { handleWhatsAppOnboardingCallback } from '@/services/whatsapp/whatsapp-onboarding.service'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'
import { NextRequest } from 'next/server'

const CallbackSDKBodySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  trackingCode: z.string().min(1, 'Tracking code is required'),
  phoneNumberIds: z.array(z.string()).optional(),
})

type CallbackSDKBody = z.infer<typeof CallbackSDKBodySchema>

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = CallbackSDKBodySchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn(
        { issues: validationResult.error.issues },
        '[OnboardingCallbackSDK] Validation failed'
      )
      return apiError('Invalid request body', 400)
    }

    const payload: CallbackSDKBody = validationResult.data

    logger.info(
      {
        trackingCode: payload.trackingCode,
        hasPhoneNumberIds: Boolean(payload.phoneNumberIds?.length),
        phoneCount: payload.phoneNumberIds?.length || 0,
      },
      '[OnboardingCallbackSDK] Processing JS SDK callback'
    )

    // Call the same handler, but with phoneNumberIds from JS SDK response
    const result = await handleWhatsAppOnboardingCallback(
      {
        code: payload.code,
        state: payload.trackingCode,
        error: null,
        errorDescription: null,
        phoneNumberIds: payload.phoneNumberIds, // Pass the phone IDs from FB.login
      },
      // For JS SDK flow, don't pass redirectUri (it will be null internally)
      request.nextUrl.origin
    )

    if (!result.success) {
      logger.warn(
        { trackingCode: payload.trackingCode, message: result.message },
        '[OnboardingCallbackSDK] Callback failed'
      )
      return apiError(result.message, 400)
    }

    logger.info(
      { trackingCode: payload.trackingCode, totalPhones: result.totalPhones },
      '[OnboardingCallbackSDK] Onboarding completed successfully'
    )

    return apiSuccess({
      success: true,
      message: 'WhatsApp onboarding completed',
      totalPhones: result.totalPhones,
    })
  } catch (error) {
    logger.error({ err: error }, '[OnboardingCallbackSDK] Error processing callback')
    return apiError('Internal server error', 500, error)
  }
}
