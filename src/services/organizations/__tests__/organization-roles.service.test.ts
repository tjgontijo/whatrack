import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  organizationRole: {
    findFirst: vi.fn(),
  },
}))

const rbacServiceMock = vi.hoisted(() => ({
  createOrganizationRole: vi.fn(),
  deleteOrganizationRole: vi.fn(),
  listOrganizationRoles: vi.fn(),
  updateOrganizationRole: vi.fn(),
}))

const permissionPolicyMock = vi.hoisted(() => ({
  assertCanDelegatePermissions: vi.fn(),
  getDelegatablePermissionCatalog: vi.fn(),
}))

const auditServiceMock = vi.hoisted(() => ({
  log: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/server/organization/organization-rbac.service', () => rbacServiceMock)
vi.mock('@/server/organization/permission-delegation-policy', () => permissionPolicyMock)
vi.mock('@/services/audit/audit.service', () => ({ auditService: auditServiceMock }))

import {
  createOrganizationRoleWithAudit,
  deleteOrganizationRoleWithAudit,
} from '@/services/organizations/organization-roles.service'

describe('organization-roles.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks role creation for non-owner', async () => {
    const result = await createOrganizationRoleWithAudit({
      organizationId: 'org-1',
      actorUserId: 'actor-1',
      actorRole: 'admin',
      actorGlobalRole: 'admin',
      data: {
        name: 'Custom',
        permissions: [],
      },
    })

    expect(result).toEqual({
      error: 'Apenas owner pode criar papéis personalizados.',
      status: 403,
    })
  })

  it('returns 404 when deleting an unknown role', async () => {
    prismaMock.organizationRole.findFirst.mockResolvedValueOnce(null)

    const result = await deleteOrganizationRoleWithAudit({
      organizationId: 'org-1',
      actorUserId: 'actor-1',
      actorRole: 'owner',
      roleId: 'role-1',
    })

    expect(result).toEqual({
      error: 'Papel não encontrado',
      status: 404,
    })
    expect(rbacServiceMock.deleteOrganizationRole).not.toHaveBeenCalled()
  })
})
