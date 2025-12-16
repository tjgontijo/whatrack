import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/pricing']
const AUTH_ROUTES = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password']
const PUBLIC_API_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/contact',
  '/api/v1/meta-ads/metrics',
  '/api/v1/whatsapp/webhook', // webhooks do provedor não exigem sessão
  '/api/v1/billing/plans', // planos públicos para página de pricing
  '/api/v1/company/lookup-public', // lookup de CNPJ público para sign-up
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

function clearSessionCookie(response: NextResponse) {
  response.cookies.set('better-auth.session_token', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  return response
}

function unauthorizedResponse(request: NextRequest) {
  if (isApiRoute(request.nextUrl.pathname)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.redirect(new URL('/sign-in', request.url))
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const sessionToken = request.cookies.get('better-auth.session_token')?.value
  const hasSessionCookie = Boolean(sessionToken)

  // Usuário logado tentando acessar páginas de auth → redireciona para dashboard
  if (hasSessionCookie && isAuthPage(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Páginas públicas e APIs públicas → permite acesso
  if (isPublicPage(pathname) || isAuthPage(pathname) || isPublicApi(pathname)) {
    return NextResponse.next()
  }

  // Para rotas de API protegidas, não faça redirect no middleware.
  // Deixe o próprio Route Handler responder (401/403) corretamente.
  if (isApiRoute(pathname)) {
    return NextResponse.next()
  }

  // Rotas protegidas sem sessão → redireciona para login
  if (!hasSessionCookie) {
    return unauthorizedResponse(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - images (public images)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|images|favicon.ico).*)',
  ],
}
