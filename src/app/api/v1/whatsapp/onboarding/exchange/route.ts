import { z } from 'zod'
import { apiError, apiSuccess } from '@/lib/utils/api-response'
import { handleWhatsAppOnboardingCallback } from '@/features/whatsapp/services/whatsapp-onboarding.service'

const ExchangeSchema = z.object({
  code: z.string().min(1, 'code is required'),
  state: z.string().min(1, 'state is required'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = ExchangeSchema.safeParse(body)

    if (!validation.success) {
      return apiError('Invalid request body', 400)
    }

    const { code, state } = validation.data

    const result = await handleWhatsAppOnboardingCallback(
      { code, state, error: null, errorDescription: null },
      new URL(request.url).origin
    )

    if (!result.success) {
      return apiError(result.message, 400)
    }

    return apiSuccess({ success: true, totalPhones: result.totalPhones })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return apiError(message, 500, error)
  }
}
