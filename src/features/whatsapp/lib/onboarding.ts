export const WHATSAPP_ONBOARDING_RESULT_STORAGE_KEY = 'wa_onboarding_result'

export function isWhatsAppEmbeddedSignupConfigured(
  appId = process.env.NEXT_PUBLIC_META_APP_ID,
  configId = process.env.NEXT_PUBLIC_META_CONFIG_ID
): boolean {
  return Boolean(appId && configId)
}

export function buildWhatsAppEmbeddedSignupUrl(
  onboardingUrl: string,
  trackingCode: string
): string {
  const url = new URL(onboardingUrl)

  if (url.searchParams.get('state') !== trackingCode) {
    url.searchParams.set('state', trackingCode)
  }

  return url.toString()
}
