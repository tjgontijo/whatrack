import { describe, expect, it } from 'vitest'

import { hasPermission } from '@/lib/auth/rbac/roles'

describe('tenant RBAC permissions', () => {
  it('grants canonical organization permissions for owner/admin', () => {
    expect(hasPermission('owner', 'manage:organization')).toBe(true)
    expect(hasPermission('admin', 'manage:members')).toBe(true)
    expect(hasPermission('owner', 'manage:meta')).toBe(true)
    expect(hasPermission('admin', 'manage:meta')).toBe(true)
    expect(hasPermission('admin', 'manage:organization')).toBe(false)
    expect(hasPermission('user', 'manage:meta')).toBe(false)
  })

  it('does not grant unknown permissions', () => {
    expect(hasPermission('owner', 'manage:unknown' as any)).toBe(false)
    expect(hasPermission('admin', 'manage:unknown' as any)).toBe(false)
  })

  it('denies unknown roles by default', () => {
    expect(hasPermission('ghost-role', 'view:dashboard')).toBe(false)
  })
})
