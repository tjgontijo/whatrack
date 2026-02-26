import { prisma } from '@/lib/db/prisma'
import { auditService } from '@/services/audit/audit.service'
import {
  createOrganizationRole,
  deleteOrganizationRole,
  listOrganizationRoles,
  updateOrganizationRole,
} from '@/server/organization/organization-rbac.service'
import {
  assertCanDelegatePermissions,
  getDelegatablePermissionCatalog,
} from '@/server/organization/permission-delegation-policy'
import type {
  CreateOrganizationRoleInput,
  UpdateOrganizationRoleInput,
} from '@/schemas/organizations/organization-role-schemas'

type ServiceError = {
  error: string
  status: 400 | 403 | 404
  details?: unknown
}

export async function listOrganizationRolesWithCatalog(input: {
  organizationId: string
  globalRole?: string
}) {
  const roles = await listOrganizationRoles(input.organizationId)
  return {
    data: roles,
    permissionCatalog: getDelegatablePermissionCatalog(input.globalRole),
  }
}

export async function createOrganizationRoleWithAudit(input: {
  organizationId: string
  actorUserId: string
  actorRole: string
  actorGlobalRole?: string
  data: CreateOrganizationRoleInput
}) {
  if (input.actorRole !== 'owner') {
    return { error: 'Apenas owner pode criar papéis personalizados.', status: 403 as const }
  }

  assertCanDelegatePermissions(input.actorGlobalRole, input.data.permissions)

  const role = await createOrganizationRole({
    organizationId: input.organizationId,
    key: input.data.key,
    name: input.data.name,
    description: input.data.description,
    permissions: input.data.permissions,
  })

  void auditService.log({
    organizationId: input.organizationId,
    userId: input.actorUserId,
    action: 'organization.role_created',
    resourceType: 'organization_role',
    resourceId: role.id,
    after: {
      key: role.key,
      name: role.name,
      permissions: role.permissions,
    },
  })

  return role
}

export async function updateOrganizationRoleWithAudit(input: {
  organizationId: string
  actorUserId: string
  actorRole: string
  actorGlobalRole?: string
  roleId: string
  data: UpdateOrganizationRoleInput
}): Promise<
  | {
      id: string
      organizationId: string
      key: string
      name: string
      description: string | null
      isSystem: boolean
      createdAt: Date
      updatedAt: Date
      permissions: string[]
    }
  | ServiceError
> {
  if (input.actorRole !== 'owner') {
    return { error: 'Apenas owner pode editar papéis personalizados.', status: 403 }
  }

  const before = await prisma.organizationRole.findFirst({
    where: {
      id: input.roleId,
      organizationId: input.organizationId,
    },
    include: {
      permissions: {
        select: {
          permissionKey: true,
        },
      },
    },
  })

  if (!before) {
    return { error: 'Papel não encontrado', status: 404 }
  }

  if (input.data.permissions) {
    assertCanDelegatePermissions(input.actorGlobalRole, input.data.permissions)
  }

  const updated = await updateOrganizationRole({
    organizationId: input.organizationId,
    roleId: input.roleId,
    name: input.data.name,
    description: input.data.description,
    permissions: input.data.permissions,
  })

  void auditService.log({
    organizationId: input.organizationId,
    userId: input.actorUserId,
    action: 'organization.role_updated',
    resourceType: 'organization_role',
    resourceId: input.roleId,
    before: {
      key: before.key,
      name: before.name,
      description: before.description,
      permissions: before.permissions.map((item) => item.permissionKey),
    },
    after: {
      key: updated.key,
      name: updated.name,
      description: updated.description,
      permissions: updated.permissions,
    },
  })

  return updated
}

export async function deleteOrganizationRoleWithAudit(input: {
  organizationId: string
  actorUserId: string
  actorRole: string
  roleId: string
}): Promise<{ success: true } | ServiceError> {
  if (input.actorRole !== 'owner') {
    return { error: 'Apenas owner pode remover papéis personalizados.', status: 403 }
  }

  const before = await prisma.organizationRole.findFirst({
    where: {
      id: input.roleId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      isSystem: true,
    },
  })

  if (!before) {
    return { error: 'Papel não encontrado', status: 404 }
  }

  await deleteOrganizationRole({
    organizationId: input.organizationId,
    roleId: input.roleId,
  })

  void auditService.log({
    organizationId: input.organizationId,
    userId: input.actorUserId,
    action: 'organization.role_deleted',
    resourceType: 'organization_role',
    resourceId: input.roleId,
    before,
  })

  return { success: true }
}
