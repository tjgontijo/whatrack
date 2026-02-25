import { describe, expect, it } from 'vitest'

import { type Permission } from '@/lib/auth/rbac/roles'
import { resolveEffectivePermissions } from '@/server/organization/organization-rbac.service'

describe('organization-rbac resolveEffectivePermissions', () => {
  const catalog: Permission[] = ['view:ai', 'manage:ai', 'manage:team_settings']

  it('aplica deny com precedencia sobre papel base e allow', () => {
    const result = resolveEffectivePermissions({
      basePermissions: ['view:ai', 'manage:ai'],
      allowOverrides: ['manage:team_settings', 'manage:ai'],
      denyOverrides: ['manage:ai'],
      catalog,
    })

    expect(result.effectivePermissions).toEqual(['manage:team_settings', 'view:ai'])
    expect(result.permissions.find((item) => item.key === 'manage:ai')).toEqual({
      key: 'manage:ai',
      allowed: false,
      source: 'override_deny',
    })
  })

  it('nega por padrao quando nao existe papel ou override', () => {
    const result = resolveEffectivePermissions({
      basePermissions: [],
      allowOverrides: [],
      denyOverrides: [],
      catalog,
    })

    expect(result.effectivePermissions).toEqual([])
    expect(result.permissions.every((item) => item.allowed === false)).toBe(true)
    expect(result.permissions.every((item) => item.source === 'none')).toBe(true)
  })
})
