import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  member: {
    findFirst: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}))

const rbacServiceMock = vi.hoisted(() => ({
  getOrganizationRoleByKey: vi.fn(),
  listOrganizationMembersWithOverrides: vi.fn(),
  listEffectivePermissions: vi.fn(),
  setMemberPermissionOverrides: vi.fn(),
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
  listOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from '@/services/organizations/organization-members.service'

describe('organization-members.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks member listing for non admin/owner', async () => {
    const result = await listOrganizationMembers({
      organizationId: 'org-1',
      role: 'user',
    })

    expect(result).toEqual({
      error: 'Apenas owner/admin podem visualizar a lista de membros.',
      status: 403,
    })
  })

  it('prevents removing last owner', async () => {
    prismaMock.member.findFirst.mockResolvedValueOnce({
      id: 'member-1',
      userId: 'user-1',
      role: 'owner',
    })
    prismaMock.member.count.mockResolvedValueOnce(1)

    const result = await removeOrganizationMember({
      organizationId: 'org-1',
      actorUserId: 'actor-1',
      actorRole: 'owner',
      memberId: 'member-1',
    })

    expect(result).toEqual({
      error: 'Não é possível remover o último owner da equipe.',
      status: 400,
    })
    expect(prismaMock.member.delete).not.toHaveBeenCalled()
  })

  it('prevents admin from assigning owner role', async () => {
    rbacServiceMock.getOrganizationRoleByKey.mockResolvedValueOnce({
      key: 'owner',
      name: 'Owner',
      permissions: [{ permissionKey: 'manage:members' }],
    })
    prismaMock.member.findFirst.mockResolvedValueOnce({
      id: 'member-1',
      userId: 'user-1',
      role: 'user',
    })

    const result = await updateOrganizationMemberRole({
      organizationId: 'org-1',
      actorUserId: 'actor-1',
      actorRole: 'admin',
      actorGlobalRole: 'admin',
      memberId: 'member-1',
      role: 'owner',
    })

    expect(result).toEqual({
      error: 'Somente owner pode alterar papel para/de owner.',
      status: 403,
    })
    expect(prismaMock.member.update).not.toHaveBeenCalled()
  })
})
