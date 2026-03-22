import { describe, expect, it } from 'vitest'

import { type Permission } from '@/lib/auth/rbac/roles'
import { resolveEffectivePermissions } from '@/server/organization/organization-rbac.service'

describe('organization-rbac resolveEffectivePermissions', () => {
  const catalog: Permission[] = ['view:dashboard', 'manage:campaigns', 'manage:organization']

  it('aplica deny com precedencia sobre papel base e allow', () => {
    const result = resolveEffectivePermissions({
      basePermissions: ['view:dashboard', 'manage:campaigns'],
      allowOverrides: ['manage:organization', 'manage:campaigns'],
      denyOverrides: ['manage:campaigns'],
      catalog,
    })

    expect(result.effectivePermissions).toEqual(['manage:organization', 'view:dashboard'])
    expect(result.permissions.find((item) => item.key === 'manage:campaigns')).toEqual({
      key: 'manage:campaigns',
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
