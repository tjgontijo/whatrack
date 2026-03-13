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
  const extras = {
    featureType: 'whatsapp_business_app_onboarding',
    sessionInfoVersion: '3',
    version: 'v3',
    sessionInfo: { trackingCode },
  }

  if (url.searchParams.get('state') !== trackingCode) {
    url.searchParams.set('state', trackingCode)
  }

  url.searchParams.set('extras', JSON.stringify(extras))

  return url.toString()
}
