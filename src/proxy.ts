import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/pricing']
const AUTH_ROUTES = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password']

const PUBLIC_API_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/contact',
  '/api/v1/meta-ads/metrics',
  '/api/v1/whatsapp/webhook',
  '/api/v1/billing/plans',
  '/api/v1/company/lookup-public',
]

function isApiRoute(pathname: string) {
  return pathname.startsWith('/api/')
}

function isPublicPage(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

function isAuthPage(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

function isPublicApi(pathname: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function looksLikeSessionCookie(v?: string) {
  if (!v) return false
  const dot = v.indexOf('.')
  if (dot <= 0) return false
  if (dot === v.length - 1) return false
  if (v.length < 30) return false
  return true
}

function unauthorizedResponse(request: NextRequest) {
  if (isApiRoute(request.nextUrl.pathname)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.redirect(new URL('/sign-in', request.url))
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (isPublicPage(pathname) || isAuthPage(pathname) || isPublicApi(pathname)) {
    return NextResponse.next()
  }

  const sessionToken = request.cookies.get('better-auth.session_token')?.value
  const hasPlausibleCookie = looksLikeSessionCookie(sessionToken)

  if (!hasPlausibleCookie) {
    return unauthorizedResponse(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|images|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
