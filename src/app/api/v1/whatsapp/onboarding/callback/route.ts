import { handleWhatsAppOnboardingCallback } from '@/services/whatsapp/whatsapp-onboarding.service'

const APP_URL = process.env.APP_URL

function redirectToError(message: string) {
  return Response.redirect(
    `${APP_URL}/dashboard/settings/whatsapp?status=error&message=${encodeURIComponent(message)}`
  )
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const result = await handleWhatsAppOnboardingCallback({
      code: url.searchParams.get('code'),
      state: url.searchParams.get('state'),
      error: url.searchParams.get('error'),
      errorDescription: url.searchParams.get('error_description'),
    }, url.origin)

    if (!result.success) {
      return redirectToError(result.message)
    }

    return Response.redirect(
      `${APP_URL}/dashboard/settings/whatsapp?status=success&phones=${result.totalPhones}`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return redirectToError(message)
  }
}
