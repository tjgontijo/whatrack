const PUBLIC_PAGE_PREFIXES = [
  '/',
  '/billing/success',
  '/privacy',
  '/terms',
  '/solucoes',
] as const

const AUTH_PAGE_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/accept-invitation',
] as const

const PUBLIC_API_EXACT_PATHS = new Set([
  '/api/v1/billing/plans',
  '/api/v1/contact',
  '/api/v1/billing/webhooks/stripe',
  '/api/v1/meta-ads/callback',
  '/api/v1/whatsapp/onboarding/callback',
  '/api/v1/whatsapp/webhook',
])

const PUBLIC_API_PREFIXES = ['/api/v1/auth/', '/api/v1/cron/'] as const

export function isPublicPagePath(pathname: string): boolean {
  return PUBLIC_PAGE_PREFIXES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export function isAuthPagePath(pathname: string): boolean {
  return AUTH_PAGE_PREFIXES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export function isPublicApiPath(pathname: string): boolean {
  if (PUBLIC_API_EXACT_PATHS.has(pathname)) {
    return true
  }

  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true
  }

  return /^\/api\/v1\/invitations\/[^/]+\/public$/.test(pathname)
}

export function buildSignInRedirectPath(pathname: string, search: string): string {
  const nextPath = `${pathname}${search}`
  const params = new URLSearchParams({ next: nextPath })
  return `/sign-in?${params.toString()}`
}
