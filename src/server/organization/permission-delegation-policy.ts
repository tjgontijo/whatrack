import { getPlatformPermissions, type Permission } from '@/lib/auth/rbac/roles'

import { OrganizationRbacError } from './organization-rbac.service'

const PLATFORM_ADMIN_GLOBAL_ROLES = new Set(['owner', 'admin'])

const BLOCKED_FOR_NON_PLATFORM_ADMIN: Permission[] = [
  'view:audit',
  'manage:campaigns',
  'manage:integrations',
  'manage:meta',
  'manage:whatsapp',
  'manage:members',
  'manage:organization',
  'manage:settings',
]

const BLOCKED_FOR_NON_PLATFORM_ADMIN_SET = new Set<Permission>(BLOCKED_FOR_NON_PLATFORM_ADMIN)

export function isPlatformAdminGlobalRole(role: string | null | undefined): boolean {
  if (!role) return false
  return PLATFORM_ADMIN_GLOBAL_ROLES.has(role)
}

export function getDelegatablePermissionCatalog(globalRole: string | null | undefined): Permission[] {
  const catalog = getPlatformPermissions()
  if (isPlatformAdminGlobalRole(globalRole)) {
    return catalog
  }

  return catalog.filter((permission) => !BLOCKED_FOR_NON_PLATFORM_ADMIN_SET.has(permission))
}

export function assertCanDelegatePermissions(
  globalRole: string | null | undefined,
  permissions: string[]
) {
  if (isPlatformAdminGlobalRole(globalRole)) {
    return
  }

  const blocked = permissions.filter((permission) =>
    BLOCKED_FOR_NON_PLATFORM_ADMIN_SET.has(permission as Permission)
  )

  if (blocked.length === 0) {
    return
  }

  throw new OrganizationRbacError(
    `Sua conta no SaaS não pode delegar estas permissões: ${blocked.join(', ')}`,
    {
      status: 403,
      code: 'PERMISSION_DELEGATION_BLOCKED',
    }
  )
}
