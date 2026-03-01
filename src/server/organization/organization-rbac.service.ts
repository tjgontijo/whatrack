import { Prisma } from '@db/client'

import { prisma } from '@/lib/db/prisma'
import {
  SYSTEM_ROLE_KEYS,
  getDefaultPermissionsForRole,
  getPermissionCandidates,
  getPlatformPermissions,
  getRoleDefinitions,
  isSystemRoleKey,
  type Permission,
} from '@/lib/auth/rbac/roles'

export type PermissionOverrideEffect = 'allow' | 'deny'

export type OrganizationRoleWithPermissions = {
  id: string
  organizationId: string
  key: string
  name: string
  description: string | null
  isSystem: boolean
  createdAt: Date
  updatedAt: Date
  permissions: Permission[]
}

export type EffectivePermissionSource = 'role' | 'override_allow' | 'override_deny' | 'none'

export type EffectivePermissionItem = {
  key: Permission
  allowed: boolean
  source: EffectivePermissionSource
}

export type EffectivePermissionsResult = {
  memberId: string
  organizationId: string
  roleKey: string
  roleExists: boolean
  roleName: string | null
  basePermissions: Permission[]
  allowOverrides: Permission[]
  denyOverrides: Permission[]
  effectivePermissions: Permission[]
  permissions: EffectivePermissionItem[]
}

export function resolveEffectivePermissions(input: {
  basePermissions: Permission[]
  allowOverrides: Permission[]
  denyOverrides: Permission[]
  catalog?: Permission[]
}): Pick<EffectivePermissionsResult, 'effectivePermissions' | 'permissions'> {
  const catalog = input.catalog ?? PLATFORM_PERMISSIONS
  const baseSet = new Set(input.basePermissions)
  const allowSet = new Set(input.allowOverrides)
  const denySet = new Set(input.denyOverrides)

  const permissions = catalog.map((permission) => {
    if (denySet.has(permission)) {
      return {
        key: permission,
        allowed: false,
        source: 'override_deny' as const,
      }
    }

    if (allowSet.has(permission)) {
      return {
        key: permission,
        allowed: true,
        source: 'override_allow' as const,
      }
    }

    if (baseSet.has(permission)) {
      return {
        key: permission,
        allowed: true,
        source: 'role' as const,
      }
    }

    return {
      key: permission,
      allowed: false,
      source: 'none' as const,
    }
  })

  const effectiveSet = new Set<Permission>(input.basePermissions)
  for (const permission of input.allowOverrides) effectiveSet.add(permission)
  for (const permission of input.denyOverrides) effectiveSet.delete(permission)

  return {
    effectivePermissions: Array.from(effectiveSet).sort((a, b) => a.localeCompare(b)),
    permissions,
  }
}

export class OrganizationRbacError extends Error {
  status: number
  code: string

  constructor(message: string, options?: { status?: number; code?: string }) {
    super(message)
    this.name = 'OrganizationRbacError'
    this.status = options?.status ?? 400
    this.code = options?.code ?? 'RBAC_ERROR'
  }
}

const PLATFORM_PERMISSIONS = getPlatformPermissions({ includeHidden: true })
const PLATFORM_PERMISSION_SET = new Set<Permission>(PLATFORM_PERMISSIONS)
const VISIBLE_PLATFORM_PERMISSION_SET = new Set<Permission>(getPlatformPermissions())

type MemberWithRoleAndOverrides = {
  id: string
  organizationId: string
  userId: string
  role: string
  permissionOverrides: Array<{
    permissionKey: string
    effect: string
  }>
  organization: {
    organizationRoles: Array<{
      id: string
      key: string
      name: string
      permissions: Array<{ permissionKey: string }>
    }>
  }
}

function toPermissionKey(value: string): Permission | null {
  return PLATFORM_PERMISSION_SET.has(value as Permission) ? (value as Permission) : null
}

function sanitizePermissions(values: string[]): Permission[] {
  const unique = new Set<Permission>()
  for (const value of values) {
    const normalized = toPermissionKey(value)
    if (normalized) unique.add(normalized)
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b))
}

function normalizeRoleKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function assertValidPermissionKeys(values: string[]) {
  const unknown = values.filter((value) => !PLATFORM_PERMISSION_SET.has(value as Permission))
  if (unknown.length > 0) {
    throw new OrganizationRbacError(`Permissões inválidas: ${unknown.join(', ')}`, {
      status: 400,
      code: 'INVALID_PERMISSION',
    })
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  )
}

function mapRolePermissions(
  role: {
    id: string
    organizationId: string
    key: string
    name: string
    description: string | null
    isSystem: boolean
    createdAt: Date
    updatedAt: Date
    permissions: Array<{ permissionKey: string }>
  },
  options?: { includeHidden?: boolean }
): OrganizationRoleWithPermissions {
  const permissions = sanitizePermissions(role.permissions.map((item) => item.permissionKey))
  const visiblePermissions = options?.includeHidden
    ? permissions
    : permissions.filter((permission) => VISIBLE_PLATFORM_PERMISSION_SET.has(permission))

  return {
    id: role.id,
    organizationId: role.organizationId,
    key: role.key,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissions: visiblePermissions,
  }
}

async function ensureSystemRolesForOrganizationTx(tx: Prisma.TransactionClient, organizationId: string) {
  const definitions = getRoleDefinitions()

  for (const definition of definitions) {
    const role = await tx.organizationRole.upsert({
      where: {
        organizationId_key: {
          organizationId,
          key: definition.name,
        },
      },
      create: {
        organizationId,
        key: definition.name,
        name: definition.label,
        description: definition.description ?? null,
        isSystem: true,
      },
      update: {
        name: definition.label,
        description: definition.description ?? null,
        isSystem: true,
      },
      select: {
        id: true,
      },
    })

    const defaultPermissions = getDefaultPermissionsForRole(definition.name)
    await tx.organizationRolePermission.deleteMany({
      where: {
        organizationRoleId: role.id,
        permissionKey: {
          notIn: defaultPermissions,
        },
      },
    })

    await tx.organizationRolePermission.createMany({
      data: defaultPermissions.map((permissionKey) => ({
        organizationRoleId: role.id,
        permissionKey,
      })),
      skipDuplicates: true,
    })
  }
}

export async function ensureSystemRolesForOrganization(organizationId: string): Promise<void> {
  const totalSystemRoles = await prisma.organizationRole.count({
    where: {
      organizationId,
      key: {
        in: [...SYSTEM_ROLE_KEYS],
      },
      isSystem: true,
    },
  })

  if (totalSystemRoles === SYSTEM_ROLE_KEYS.length) {
    return
  }

  await prisma.$transaction(async (tx) => {
    await ensureSystemRolesForOrganizationTx(tx, organizationId)
  })
}

async function getMemberAuthorizationContext(
  userId: string,
  organizationId: string
): Promise<MemberWithRoleAndOverrides | null> {
  await ensureSystemRolesForOrganization(organizationId)

  return prisma.member.findFirst({
    where: {
      userId,
      organizationId,
    },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      role: true,
      permissionOverrides: {
        select: {
          permissionKey: true,
          effect: true,
        },
      },
      organization: {
        select: {
          organizationRoles: {
            where: { organizationId },
            select: {
              id: true,
              key: true,
              name: true,
              permissions: {
                select: { permissionKey: true },
              },
            },
          },
        },
      },
    },
  })
}

function buildEffectivePermissionsFromMember(member: MemberWithRoleAndOverrides): EffectivePermissionsResult {
  const role = member.organization.organizationRoles.find((item) => item.key === member.role)

  const rolePermissions = sanitizePermissions(
    role?.permissions.map((permission) => permission.permissionKey) ?? []
  )

  const allowOverrides = sanitizePermissions(
    member.permissionOverrides
      .filter((item) => item.effect === 'allow')
      .map((item) => item.permissionKey)
  )

  const denyOverrides = sanitizePermissions(
    member.permissionOverrides
      .filter((item) => item.effect === 'deny')
      .map((item) => item.permissionKey)
  )

  const resolved = resolveEffectivePermissions({
    basePermissions: rolePermissions,
    allowOverrides,
    denyOverrides,
  })

  return {
    memberId: member.id,
    organizationId: member.organizationId,
    roleKey: member.role,
    roleExists: Boolean(role),
    roleName: role?.name ?? null,
    basePermissions: rolePermissions,
    allowOverrides,
    denyOverrides,
    effectivePermissions: resolved.effectivePermissions,
    permissions: resolved.permissions,
  }
}

export async function hasEffectivePermission(input: {
  userId: string
  organizationId: string
  permission: Permission
}): Promise<boolean> {
  const effective = await listEffectivePermissionsForUser({
    userId: input.userId,
    organizationId: input.organizationId,
  })
  if (!effective) return false
  if (!effective.roleExists) return false

  const effectiveSet = new Set(effective.effectivePermissions)
  const denySet = new Set(effective.denyOverrides)
  const candidates = getPermissionCandidates(input.permission)

  if (candidates.some((candidate) => denySet.has(candidate))) {
    return false
  }

  return candidates.some((candidate) => effectiveSet.has(candidate))
}

export async function listEffectivePermissionsForUser(input: {
  userId: string
  organizationId: string
}): Promise<EffectivePermissionsResult | null> {
  const context = await getMemberAuthorizationContext(input.userId, input.organizationId)
  if (!context) return null
  return buildEffectivePermissionsFromMember(context)
}

export async function listEffectivePermissions(memberId: string): Promise<EffectivePermissionsResult> {
  const memberScope = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      organizationId: true,
    },
  })

  if (!memberScope) {
    throw new OrganizationRbacError('Membro não encontrado', { status: 404, code: 'MEMBER_NOT_FOUND' })
  }

  await ensureSystemRolesForOrganization(memberScope.organizationId)

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      role: true,
      permissionOverrides: {
        select: {
          permissionKey: true,
          effect: true,
        },
      },
      organization: {
        select: {
          organizationRoles: {
            select: {
              id: true,
              key: true,
              name: true,
              permissions: {
                select: {
                  permissionKey: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!member) {
    throw new OrganizationRbacError('Membro não encontrado', { status: 404, code: 'MEMBER_NOT_FOUND' })
  }

  return buildEffectivePermissionsFromMember(member)
}

export async function listOrganizationRoles(
  organizationId: string,
  options?: { includeHiddenPermissions?: boolean }
): Promise<OrganizationRoleWithPermissions[]> {
  await ensureSystemRolesForOrganization(organizationId)

  const roles = await prisma.organizationRole.findMany({
    where: { organizationId },
    include: {
      permissions: {
        select: {
          permissionKey: true,
        },
      },
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  })

  return roles.map((role) =>
    mapRolePermissions(role, { includeHidden: options?.includeHiddenPermissions })
  )
}

export async function assertRoleExistsForOrganization(
  organizationId: string,
  roleKey: string
): Promise<void> {
  await ensureSystemRolesForOrganization(organizationId)
  const role = await prisma.organizationRole.findFirst({
    where: { organizationId, key: roleKey },
    select: { id: true },
  })

  if (!role) {
    throw new OrganizationRbacError('Papel não encontrado para esta organização', {
      status: 404,
      code: 'ROLE_NOT_FOUND',
    })
  }
}

export async function getOrganizationRoleByKey(organizationId: string, roleKey: string) {
  await ensureSystemRolesForOrganization(organizationId)
  return prisma.organizationRole.findFirst({
    where: {
      organizationId,
      key: roleKey,
    },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      isSystem: true,
      permissions: {
        select: {
          permissionKey: true,
        },
      },
    },
  })
}

export async function createOrganizationRole(input: {
  organizationId: string
  key?: string
  name: string
  description?: string | null
  permissions: string[]
}): Promise<OrganizationRoleWithPermissions> {
  await ensureSystemRolesForOrganization(input.organizationId)

  const roleKey = normalizeRoleKey(input.key ?? input.name)
  if (!roleKey || roleKey.length < 2 || roleKey.length > 64) {
    throw new OrganizationRbacError('Chave de papel inválida', {
      status: 400,
      code: 'INVALID_ROLE_KEY',
    })
  }

  if (isSystemRoleKey(roleKey)) {
    throw new OrganizationRbacError('Não é permitido criar papel com chave reservada', {
      status: 409,
      code: 'RESERVED_ROLE_KEY',
    })
  }

  assertValidPermissionKeys(input.permissions)

  try {
    const role = await prisma.organizationRole.create({
      data: {
        organizationId: input.organizationId,
        key: roleKey,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        isSystem: false,
        permissions: {
          createMany: {
            data: Array.from(new Set(input.permissions)).map((permissionKey) => ({ permissionKey })),
            skipDuplicates: true,
          },
        },
      },
      include: {
        permissions: {
          select: {
            permissionKey: true,
          },
        },
      },
    })

    return mapRolePermissions(role, { includeHidden: true })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new OrganizationRbacError('Já existe um papel com esta chave ou nome', {
        status: 409,
        code: 'ROLE_CONFLICT',
      })
    }
    throw error
  }
}

export async function updateOrganizationRole(input: {
  organizationId: string
  roleId: string
  name?: string
  description?: string | null
  permissions?: string[]
}): Promise<OrganizationRoleWithPermissions> {
  await ensureSystemRolesForOrganization(input.organizationId)

  const role = await prisma.organizationRole.findFirst({
    where: { id: input.roleId, organizationId: input.organizationId },
    include: {
      permissions: {
        select: {
          permissionKey: true,
        },
      },
    },
  })

  if (!role) {
    throw new OrganizationRbacError('Papel não encontrado', { status: 404, code: 'ROLE_NOT_FOUND' })
  }

  if (role.isSystem) {
    throw new OrganizationRbacError('Papéis de sistema não podem ser editados', {
      status: 400,
      code: 'SYSTEM_ROLE_IMMUTABLE',
    })
  }

  if (input.permissions) {
    assertValidPermissionKeys(input.permissions)
  }

  try {
    const updatedRole = await prisma.$transaction(async (tx) => {
      const updated = await tx.organizationRole.update({
        where: { id: role.id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        },
        include: {
          permissions: {
            select: {
              permissionKey: true,
            },
          },
        },
      })

      if (input.permissions) {
        const uniquePermissions = Array.from(new Set(input.permissions))

        await tx.organizationRolePermission.deleteMany({
          where: {
            organizationRoleId: role.id,
            permissionKey: { notIn: uniquePermissions },
          },
        })

        await tx.organizationRolePermission.createMany({
          data: uniquePermissions.map((permissionKey) => ({
            organizationRoleId: role.id,
            permissionKey,
          })),
          skipDuplicates: true,
        })

        return tx.organizationRole.findUniqueOrThrow({
          where: { id: role.id },
          include: {
            permissions: {
              select: {
                permissionKey: true,
              },
            },
          },
        })
      }

      return updated
    })

    return mapRolePermissions(updatedRole, { includeHidden: true })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new OrganizationRbacError('Já existe um papel com este nome', {
        status: 409,
        code: 'ROLE_CONFLICT',
      })
    }
    throw error
  }
}

export async function deleteOrganizationRole(input: {
  organizationId: string
  roleId: string
}): Promise<void> {
  await ensureSystemRolesForOrganization(input.organizationId)

  const role = await prisma.organizationRole.findFirst({
    where: { id: input.roleId, organizationId: input.organizationId },
    select: {
      id: true,
      key: true,
      isSystem: true,
    },
  })

  if (!role) {
    throw new OrganizationRbacError('Papel não encontrado', { status: 404, code: 'ROLE_NOT_FOUND' })
  }

  if (role.isSystem) {
    throw new OrganizationRbacError('Papéis de sistema não podem ser removidos', {
      status: 400,
      code: 'SYSTEM_ROLE_IMMUTABLE',
    })
  }

  const membersUsingRole = await prisma.member.count({
    where: {
      organizationId: input.organizationId,
      role: role.key,
    },
  })

  if (membersUsingRole > 0) {
    throw new OrganizationRbacError('Não é possível excluir papel em uso por membros', {
      status: 400,
      code: 'ROLE_IN_USE',
    })
  }

  await prisma.organizationRole.delete({
    where: { id: role.id },
  })
}

export async function listOrganizationMembersWithOverrides(organizationId: string) {
  await ensureSystemRolesForOrganization(organizationId)

  const members = await prisma.member.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      permissionOverrides: {
        select: {
          permissionKey: true,
          effect: true,
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
  })

  return members.map((member) => ({
    id: member.id,
    memberId: member.id,
    userId: member.userId,
    role: member.role,
    createdAt: member.createdAt,
    user: member.user,
    name: member.user.name,
    email: member.user.email,
    image: member.user.image,
    overrides: {
      allow: sanitizePermissions(
        member.permissionOverrides
          .filter((item) => item.effect === 'allow')
          .map((item) => item.permissionKey)
      ),
      deny: sanitizePermissions(
        member.permissionOverrides
          .filter((item) => item.effect === 'deny')
          .map((item) => item.permissionKey)
      ),
    },
  }))
}

export async function setMemberPermissionOverrides(input: {
  organizationId: string
  memberId: string
  allow: string[]
  deny: string[]
}) {
  assertValidPermissionKeys(input.allow)
  assertValidPermissionKeys(input.deny)

  const allowSet = new Set(input.allow)
  const denySet = new Set(input.deny)
  const overlap = Array.from(allowSet).filter((permission) => denySet.has(permission))

  if (overlap.length > 0) {
    throw new OrganizationRbacError(
      `Permissões não podem existir em allow e deny ao mesmo tempo: ${overlap.join(', ')}`,
      { status: 400, code: 'INVALID_OVERRIDE_CONFLICT' }
    )
  }

  const member = await prisma.member.findFirst({
    where: {
      id: input.memberId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
    },
  })

  if (!member) {
    throw new OrganizationRbacError('Membro não encontrado', { status: 404, code: 'MEMBER_NOT_FOUND' })
  }

  const allow = Array.from(allowSet)
  const deny = Array.from(denySet)
  const all = [...allow, ...deny]

  await prisma.$transaction(async (tx) => {
    await tx.memberPermissionOverride.deleteMany({
      where: {
        memberId: member.id,
        ...(all.length > 0 ? { permissionKey: { notIn: all } } : {}),
      },
    })

    for (const permission of allow) {
      await tx.memberPermissionOverride.upsert({
        where: {
          memberId_permissionKey: {
            memberId: member.id,
            permissionKey: permission,
          },
        },
        create: {
          memberId: member.id,
          permissionKey: permission,
          effect: 'allow',
        },
        update: {
          effect: 'allow',
        },
      })
    }

    for (const permission of deny) {
      await tx.memberPermissionOverride.upsert({
        where: {
          memberId_permissionKey: {
            memberId: member.id,
            permissionKey: permission,
          },
        },
        create: {
          memberId: member.id,
          permissionKey: permission,
          effect: 'deny',
        },
        update: {
          effect: 'deny',
        },
      })
    }
  })

  return listEffectivePermissions(member.id)
}
