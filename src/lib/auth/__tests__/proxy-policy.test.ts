import { describe, expect, it } from 'vitest'

import {
  buildSignInRedirectPath,
  isAuthPagePath,
  isPublicApiPath,
  isPublicPagePath,
} from '@/lib/auth/proxy-policy'

describe('proxy policy', () => {
  it('keeps launch public pages accessible', () => {
    expect(isPublicPagePath('/')).toBe(true)
    expect(isPublicPagePath('/billing/success')).toBe(true)
    expect(isPublicPagePath('/solucoes/agencias')).toBe(true)
    expect(isPublicPagePath('/acme/projeto-a')).toBe(false)
  })

  it('matches only explicit public apis and callbacks', () => {
    expect(isPublicApiPath('/api/v1/auth/sign-in')).toBe(true)
    expect(isPublicApiPath('/api/v1/cron/ai/classifier')).toBe(true)
    expect(isPublicApiPath('/api/v1/billing/plans')).toBe(true)
    expect(isPublicApiPath('/api/v1/billing/webhook')).toBe(true)
    expect(isPublicApiPath('/api/v1/invitations/inv-1/public')).toBe(true)
    expect(isPublicApiPath('/api/v1/meta-ads/callback')).toBe(true)
    expect(isPublicApiPath('/api/v1/whatsapp/onboarding/callback')).toBe(true)
    expect(isPublicApiPath('/api/v1/whatsapp/instances')).toBe(false)
    expect(isPublicApiPath('/api/v1/system/webhook-logs')).toBe(false)
  })

  it('preserves a safe next param when redirecting to sign-in', () => {
    expect(isAuthPagePath('/sign-in')).toBe(true)
    expect(buildSignInRedirectPath('/acme/projeto-a/billing', '?plan=pro')).toBe(
      '/sign-in?next=%2Facme%2Fprojeto-a%2Fbilling%3Fplan%3Dpro'
    )
  })
})
