import { describe, expect, it } from 'vitest'

import { hasPermission } from '@/lib/auth/rbac/roles'

describe('tenant RBAC permissions', () => {
  it('grants canonical team permissions for owner/admin', () => {
    expect(hasPermission('owner', 'manage:team_settings')).toBe(true)
    expect(hasPermission('admin', 'manage:team_members')).toBe(true)
    expect(hasPermission('admin', 'manage:team_settings')).toBe(false)
  })

  it('supports legacy permission aliases during migration', () => {
    expect(hasPermission('owner', 'manage:organization')).toBe(true)
    expect(hasPermission('admin', 'manage:members')).toBe(true)
    expect(hasPermission('admin', 'manage:team_members')).toBe(true)
  })

  it('denies unknown roles by default', () => {
    expect(hasPermission('ghost-role', 'view:dashboard')).toBe(false)
  })
})
