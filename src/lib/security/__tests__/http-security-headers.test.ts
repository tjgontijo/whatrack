import { describe, expect, it } from 'vitest'

import {
  buildContentSecurityPolicy,
  CONTENT_SECURITY_POLICY_DIRECTIVES,
  GLOBAL_SECURITY_HEADERS,
} from '@/lib/security/http-security-headers'

describe('http security headers', () => {
  it('builds a CSP with the expected hardening directives', () => {
    const csp = buildContentSecurityPolicy()

    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp.split('; ')).toEqual([...CONTENT_SECURITY_POLICY_DIRECTIVES])
  })

  it('exposes the baseline global headers', () => {
    const headerKeys = GLOBAL_SECURITY_HEADERS.map((header) => header.key)

    expect(headerKeys).toEqual([
      'Content-Security-Policy',
      'Permissions-Policy',
      'Referrer-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-Permitted-Cross-Domain-Policies',
    ])
  })
})
