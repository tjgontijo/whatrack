export interface SecurityHeader {
  key: string
  value: string
}

export const CONTENT_SECURITY_POLICY_DIRECTIVES = [
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
] as const

export function buildContentSecurityPolicy(): string {
  return CONTENT_SECURITY_POLICY_DIRECTIVES.join('; ')
}

export const GLOBAL_SECURITY_HEADERS: SecurityHeader[] = [
  {
    key: 'Content-Security-Policy',
    value: buildContentSecurityPolicy(),
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), geolocation=(), microphone=()',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Permitted-Cross-Domain-Policies',
    value: 'none',
  },
]
