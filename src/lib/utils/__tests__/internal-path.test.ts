import { describe, expect, it } from 'vitest'

import { resolveInternalPath, sanitizeInternalPath } from '@/lib/utils/internal-path'

describe('internal path helpers', () => {
  it('accepts local application paths with query string and hash', () => {
    expect(sanitizeInternalPath('/acme/projeto-a/billing?plan=pro#checkout')).toBe(
      '/acme/projeto-a/billing?plan=pro#checkout'
    )
  })

  it('rejects external or malformed redirects', () => {
    expect(sanitizeInternalPath('https://evil.com')).toBeNull()
    expect(sanitizeInternalPath('//evil.com')).toBeNull()
    expect(sanitizeInternalPath('dashboard')).toBeNull()
  })

  it('falls back to a safe internal path when needed', () => {
    expect(resolveInternalPath('https://evil.com', '/welcome')).toBe('/welcome')
    expect(resolveInternalPath('/acme/projeto-a/billing', '/welcome')).toBe(
      '/acme/projeto-a/billing'
    )
  })

  it('rewrites legacy workspace paths to welcome', () => {
    expect(resolveInternalPath('/dashboard/billing?plan=pro', '/welcome')).toBe(
      '/welcome?plan=pro'
    )
    expect(resolveInternalPath('/app', '/welcome')).toBe('/welcome')
  })
})
