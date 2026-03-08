import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  buildSignInRedirectPath,
  isAuthPagePath,
  isPublicApiPath,
  isPublicPagePath,
} from '@/lib/auth/proxy-policy'

function isApiRoute(pathname: string) {
  return pathname.startsWith('/api/')
}

function unauthorizedResponse(request: NextRequest) {
  if (isApiRoute(request.nextUrl.pathname)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const signInPath = buildSignInRedirectPath(request.nextUrl.pathname, request.nextUrl.search)
  return NextResponse.redirect(new URL(signInPath, request.url))
}

function hasSessionCookie(request: NextRequest) {
  return Boolean(
    request.cookies.get('better-auth.session_token')?.value ||
      request.cookies.get('__Secure-better-auth.session_token')?.value
  )
}

import { randomUUID } from 'crypto'
import { requestContextStorage } from '@/lib/utils/request-context'

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (isPublicPagePath(pathname) || isAuthPagePath(pathname) || isPublicApiPath(pathname)) {
    return NextResponse.next()
  }

  if (!hasSessionCookie(request)) {
    return unauthorizedResponse(request)
  }

  const requestId = randomUUID()
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    null
  const userAgent = request.headers.get('user-agent') ?? null

  return requestContextStorage.run({ requestId, ip, userAgent }, () => {
    const res = NextResponse.next()
    res.headers.set('X-Request-Id', requestId)
    return res
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|images|favicon.ico|robots.txt|sitemap.xml).*)'],
}
