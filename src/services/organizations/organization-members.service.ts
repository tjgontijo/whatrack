import { prisma } from '@/lib/db/prisma'
import { auditService } from '@/services/audit/audit.service'
import {
  getOrganizationRoleByKey,
  listEffectivePermissions,
  listOrganizationMembersWithOverrides,
  setMemberPermissionOverrides,
} from '@/server/organization/organization-rbac.service'
import {
  assertCanDelegatePermissions,
  getDelegatablePermissionCatalog,
} from '@/server/organization/permission-delegation-policy'

type ServiceError = {
  error: string
  status: 400 | 403 | 404 | 409
  details?: unknown
}

function isAdminOrOwner(role: string) {
  return role === 'owner' || role === 'admin'
}

export async function listOrganizationMembers(input: {
  organizationId: string
  role: string
}): Promise<{ data: Awaited<ReturnType<typeof listOrganizationMembersWithOverrides>> } | ServiceError> {
  if (!isAdminOrOwner(input.role)) {
    return {
      error: 'Apenas owner/admin podem visualizar a lista de membros.',
      status: 403,
    }
  }

  const members = await listOrganizationMembersWithOverrides(input.organizationId)
  return { data: members }
}

export async function removeOrganizationMember(input: {
  organizationId: string
  actorUserId: string
  actorRole: string
  memberId: string
}): Promise<{ success: true } | ServiceError> {
  if (!isAdminOrOwner(input.actorRole)) {
    return { error: 'Apenas owner/admin podem remover membros.', status: 403 }
  }

  const targetMember = await prisma.member.findFirst({
    where: { id: input.memberId, organizationId: input.organizationId },
    select: { id: true, userId: true, role: true },
  })

  if (!targetMember) {
    return { error: 'Membro não encontrado', status: 404 }
  }

  if (input.actorRole !== 'owner' && targetMember.role === 'owner') {
    return { error: 'Somente owner pode remover membros owner.', status: 403 }
  }

  if (input.actorRole === 'admin' && !['user', 'admin'].includes(targetMember.role)) {
    return { error: 'Admin pode remover apenas membros com papel user/admin.', status: 403 }
  }

  if (targetMember.role === 'owner') {
    const ownersCount = await prisma.member.count({
      where: {
        organizationId: input.organizationId,
        role: 'owner',
      },
    })

    if (ownersCount <= 1) {
      return { error: 'Não é possível remover o último owner da equipe.', status: 400 }
    }
  }

  await prisma.member.delete({
    where: { id: targetMember.id },
  })

  void auditService.log({
    organizationId: input.organizationId,
    userId: input.actorUserId,
    action: 'member.removed',
    resourceType: 'member',
    resourceId: input.memberId,
    before: { userId: targetMember.userId, role: targetMember.role },
  })

  return { success: true }
}

export async function updateOrganizationMemberRole(input: {
  organizationId: string
  actorUserId: string
  actorRole: string
  actorGlobalRole?: string
  memberId: string
  role: string
}): Promise<
  | {
      id: string
      memberId: string
      userId: string
      role: string
      user: {
        id: string
        name: string | null
        email: string
        image: string | null
      }
    }
  | ServiceError
> {
  if (!isAdminOrOwner(input.actorRole)) {
    return { error: 'Apenas owner/admin podem alterar papel de membros.', status: 403 }
  }

  const selectedRole = await getOrganizationRoleByKey(input.organizationId, input.role)
  if (!selectedRole) {
    return { error: 'Papel não encontrado para esta organização.', status: 404 }
  }

  const targetMember = await prisma.member.findFirst({
    where: {
      id: input.memberId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      userId: true,
      role: true,
    },
  })

  if (!targetMember) {
    return { error: 'Membro não encontrado', status: 404 }
  }

  if (input.actorRole !== 'owner' && (targetMember.role === 'owner' || selectedRole.key === 'owner')) {
    return { error: 'Somente owner pode alterar papel para/de owner.', status: 403 }
  }

  if (input.actorRole === 'admin' && !['user', 'admin'].includes(selectedRole.key)) {
    return { error: 'Admin pode atribuir apenas papéis user/admin.', status: 403 }
  }

  try {
    assertCanDelegatePermissions(
      input.actorGlobalRole,
      selectedRole.permissions.map((permission) => permission.permissionKey)
    )
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Permissão de delegação inválida.',
      status: 403,
    }
  }

  if (targetMember.role === 'owner' && selectedRole.key !== 'owner') {
    const ownersCount = await prisma.member.count({
      where: {
        organizationId: input.organizationId,
        role: 'owner',
      },
    })

    if (ownersCount <= 1) {
      return { error: 'Não é possível remover o último owner da equipe.', status: 400 }
    }
  }

  const updatedMember = await prisma.member.update({
    where: { id: targetMember.id },
    data: { role: selectedRole.key },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  })

  void auditService.log({
    organizationId: input.organizationId,
    userId: input.actorUserId,
    action: 'member.role_updated',
    resourceType: 'member',
    resourceId: targetMember.id,
    before: { role: targetMember.role, userId: targetMember.userId },
    after: { role: updatedMember.role, userId: updatedMember.userId, roleName: selectedRole.name },
  })

  return {
    id: updatedMember.id,
    memberId: updatedMember.id,
    userId: updatedMember.userId,
    role: updatedMember.role,
    user: updatedMember.user,
  }
}

export async function getOrganizationMemberPermissionOverrides(input: {
  organizationId: string
  actorRole: string
  actorGlobalRole?: string
  memberId: string
}) {
  if (input.actorRole !== 'owner') {
    return { error: 'Apenas owner pode gerenciar overrides de permissões.', status: 403 as const }
  }

  const target = await prisma.member.findFirst({
    where: {
      id: input.memberId,
      organizationId: input.organizationId,
    },
    select: { id: true },
  })

  if (!target) {
    return { error: 'Membro não encontrado', status: 404 as const }
  }

  const permissions = await listEffectivePermissions(target.id)
  return {
    ...permissions,
    permissionCatalog: getDelegatablePermissionCatalog(input.actorGlobalRole),
  }
}

export async function updateOrganizationMemberPermissionOverrides(input: {
  organizationId: string
  actorUserId: string
  actorRole: string
  actorGlobalRole?: string
  memberId: string
  allow: string[]
  deny: string[]
}) {
  if (input.actorRole !== 'owner') {
    return { error: 'Apenas owner pode gerenciar overrides de permissões.', status: 403 as const }
  }

  const target = await prisma.member.findFirst({
    where: {
      id: input.memberId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      role: true,
      userId: true,
    },
  })

  if (!target) {
    return { error: 'Membro não encontrado', status: 404 as const }
  }

  assertCanDelegatePermissions(input.actorGlobalRole, [...input.allow, ...input.deny])

  const before = await listEffectivePermissions(target.id)
  const updated = await setMemberPermissionOverrides({
    organizationId: input.organizationId,
    memberId: target.id,
    allow: input.allow,
    deny: input.deny,
  })

  void auditService.log({
    organizationId: input.organizationId,
    userId: input.actorUserId,
    action: 'member.permission_overrides_updated',
    resourceType: 'member',
    resourceId: target.id,
    before: {
      role: before.roleKey,
      allowOverrides: before.allowOverrides,
      denyOverrides: before.denyOverrides,
      effectivePermissions: before.effectivePermissions,
    },
    after: {
      role: updated.roleKey,
      allowOverrides: updated.allowOverrides,
      denyOverrides: updated.denyOverrides,
      effectivePermissions: updated.effectivePermissions,
    },
  })

  return {
    ...updated,
    permissionCatalog: getDelegatablePermissionCatalog(input.actorGlobalRole),
  }
}
