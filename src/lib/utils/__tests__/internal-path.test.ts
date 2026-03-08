import { describe, expect, it } from 'vitest'

import { resolveInternalPath, sanitizeInternalPath } from '@/lib/utils/internal-path'

describe('internal path helpers', () => {
  it('accepts local application paths with query string and hash', () => {
    expect(sanitizeInternalPath('/dashboard/billing?plan=pro#checkout')).toBe(
      '/dashboard/billing?plan=pro#checkout'
    )
  })

  it('rejects external or malformed redirects', () => {
    expect(sanitizeInternalPath('https://evil.com')).toBeNull()
    expect(sanitizeInternalPath('//evil.com')).toBeNull()
    expect(sanitizeInternalPath('dashboard')).toBeNull()
  })

  it('falls back to a safe internal path when needed', () => {
    expect(resolveInternalPath('https://evil.com', '/dashboard')).toBe('/dashboard')
    expect(resolveInternalPath('/dashboard/billing', '/dashboard')).toBe('/dashboard/billing')
  })
})
