import { describe, expect, it } from 'vitest'

import { OrganizationRbacError } from '@/server/organization/organization-rbac.service'
import {
  assertCanDelegatePermissions,
  getDelegatablePermissionCatalog,
} from '@/server/organization/permission-delegation-policy'

describe('permission delegation policy', () => {
  it('permite catalogo completo para admin/owner do saas', () => {
    const ownerCatalog = getDelegatablePermissionCatalog('owner')
    const adminCatalog = getDelegatablePermissionCatalog('admin')

    expect(ownerCatalog).toContain('manage:team_settings')
    expect(adminCatalog).toContain('manage:team_settings')
  })

  it('restringe permissoes sensiveis para usuario sem papel global privilegiado', () => {
    const userCatalog = getDelegatablePermissionCatalog('user')

    expect(userCatalog).not.toContain('manage:team_settings')
    expect(userCatalog).not.toContain('manage:integrations')
    expect(userCatalog).toContain('view:dashboard')
  })

  it('bloqueia delegacao de permissao sensivel para usuario comum do saas', () => {
    expect(() =>
      assertCanDelegatePermissions('user', ['view:dashboard', 'manage:team_settings'])
    ).toThrow(OrganizationRbacError)
  })

  it('permite delegacao quando papel global eh owner/admin', () => {
    expect(() =>
      assertCanDelegatePermissions('owner', ['manage:team_settings', 'manage:integrations'])
    ).not.toThrow()
  })
})
