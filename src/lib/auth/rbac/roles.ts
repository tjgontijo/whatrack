export type Permission =
  | 'view:dashboard'
  | 'view:leads'
  | 'manage:leads'
  | 'view:tickets'
  | 'manage:tickets'
  | 'view:sales'
  | 'manage:sales'
  | 'view:products'
  | 'manage:products'
  | 'view:meta'
  | 'manage:meta'
  | 'manage:members'
  | 'manage:organization'
  | 'manage:settings'

type RoleDefinition = {
  name: RoleName
  label: string
  description?: string
  permissions: Permission[]
}

export type RoleName = 'owner' | 'admin' | 'user'
export type UserRoleType = RoleName

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    name: 'owner',
    label: 'Owner',
    description: 'Acesso total ao tenant e configurações críticas.',
    permissions: [
      'view:dashboard',
      'view:leads',
      'manage:leads',
      'view:tickets',
      'manage:tickets',
      'view:sales',
      'manage:sales',
      'view:products',
      'manage:products',
      'view:meta',
      'manage:meta',
      'manage:members',
      'manage:organization',
      'manage:settings',
    ],
  },
  {
    name: 'admin',
    label: 'Administrador',
    description: 'Gerencia usuários e operações diárias.',
    permissions: [
      'view:dashboard',
      'view:leads',
      'manage:leads',
      'view:tickets',
      'manage:tickets',
      'view:sales',
      'manage:sales',
      'view:products',
      'manage:products',
      'view:meta',
      'manage:meta',
      'manage:members',
    ],
  },
  {
    name: 'user',
    label: 'Usuário',
    description: 'Acesso operacional básico.',
    permissions: [
      'view:dashboard', 
      'view:leads', 
      'view:tickets', 
      'view:sales', 
      'view:products', 
      'view:meta'],
  },
]

const ROLE_PRIORITY: RoleName[] = ['owner', 'admin', 'user']

function normalizeRole(role: string | null | undefined): RoleName {
  return (ROLE_DEFINITIONS.find((definition) => definition.name === role)?.name ?? 'user') as RoleName
}

export function getRoleDefinitions() {
  return ROLE_DEFINITIONS
}

export function hasRole(userRole: string | null | undefined, requiredRole: RoleName): boolean {
  const normalized = normalizeRole(userRole)
  return ROLE_PRIORITY.indexOf(normalized) <= ROLE_PRIORITY.indexOf(requiredRole)
}

export function isOwner(userRole: string | null | undefined): boolean {
  return normalizeRole(userRole) === 'owner'
}

export function isAdmin(userRole: string | null | undefined): boolean {
  const normalized = normalizeRole(userRole)
  return normalized === 'admin' || normalized === 'owner'
}

export function hasPermission(userRole: string | null | undefined, permission: Permission): boolean {
  const normalized = normalizeRole(userRole)
  const roleDefinition = ROLE_DEFINITIONS.find((definition) => definition.name === normalized)
  return Boolean(roleDefinition?.permissions.includes(permission))
}

export function hasAnyPermission(
  userRole: string | null | undefined,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(userRole, permission))
}

export function hasAllPermissions(
  userRole: string | null | undefined,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(userRole, permission))
}

export function canAccessResource(
  userRole: string | null | undefined,
  resourcePermission: Permission,
): boolean {
  return hasPermission(userRole, resourcePermission)
}

export function getHighestRole(
  currentRole: string | null | undefined,
  hasActiveSubscription: boolean,
): UserRoleType {
  const normalized = normalizeRole(currentRole)
  if (normalized === 'owner') return 'owner'
  if (normalized === 'admin') return 'admin'
  return hasActiveSubscription ? 'admin' : 'user'
}
