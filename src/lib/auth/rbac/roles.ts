export type Permission =
  | 'view:dashboard'
  | 'view:analytics'
  | 'view:whatsapp'
  | 'manage:whatsapp'
  | 'view:ai'
  | 'manage:ai'
  | 'view:campaigns'
  | 'manage:campaigns'
  | 'view:integrations'
  | 'manage:integrations'
  | 'view:audit'
  | 'manage:members'
  | 'manage:organization'
  | 'manage:settings'
  | 'view:leads'
  | 'manage:leads'
  | 'view:tickets'
  | 'manage:tickets'
  | 'view:sales'
  | 'manage:sales'
  | 'view:items'
  | 'manage:items'
  | 'view:meta'
  | 'manage:meta'

type RoleDefinition = {
  name: RoleName
  label: string
  description?: string
  permissions: Permission[]
}

export type RoleName = 'owner' | 'admin' | 'user'
export type UserRoleType = RoleName
export const SYSTEM_ROLE_KEYS = ['owner', 'admin', 'user'] as const

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    name: 'owner',
    label: 'Owner',
    description: 'Acesso total ao tenant e configurações críticas.',
    permissions: [
      'view:dashboard',
      'view:analytics',
      'view:whatsapp',
      'manage:whatsapp',
      'view:ai',
      'manage:ai',
      'view:campaigns',
      'manage:campaigns',
      'view:integrations',
      'manage:integrations',
      'view:audit',
      'manage:members',
      'manage:organization',
      'manage:settings',
      'view:leads',
      'manage:leads',
      'view:tickets',
      'manage:tickets',
      'view:sales',
      'manage:sales',
      'view:items',
      'manage:items',
      'view:meta',
      'manage:meta',
    ],
  },
  {
    name: 'admin',
    label: 'Administrador',
    description: 'Gerencia usuários e operações diárias.',
    permissions: [
      'view:dashboard',
      'view:analytics',
      'view:whatsapp',
      'manage:whatsapp',
      'view:ai',
      'manage:ai',
      'view:campaigns',
      'manage:campaigns',
      'view:integrations',
      'manage:integrations',
      'view:audit',
      'manage:members',
      'view:leads',
      'manage:leads',
      'view:tickets',
      'manage:tickets',
      'view:sales',
      'manage:sales',
      'view:items',
      'manage:items',
      'view:meta',
      'manage:meta',
    ],
  },
  {
    name: 'user',
    label: 'Usuário',
    description: 'Acesso operacional básico.',
    permissions: [
      'view:dashboard',
      'view:whatsapp',
      'view:ai',
      'view:campaigns',
      'view:integrations',
      'view:leads',
      'view:tickets',
      'view:sales',
      'view:items',
      'view:meta',
    ],
  },
]

const ROLE_PRIORITY: RoleName[] = ['owner', 'admin', 'user']

const HIDDEN_PLATFORM_PERMISSIONS: Permission[] = []

const ALL_PLATFORM_PERMISSIONS: Permission[] = Array.from(
  new Set(
    ROLE_DEFINITIONS.flatMap((definition) => definition.permissions).sort((a, b) =>
      a.localeCompare(b)
    )
  )
)

const PERMISSION_LABELS: Record<Permission, string> = {
  'view:dashboard': 'Visualizar Dashboard',
  'view:analytics': 'Visualizar Analytics',
  'view:whatsapp': 'Visualizar WhatsApp',
  'manage:whatsapp': 'Gerenciar WhatsApp',
  'view:ai': 'Visualizar IA',
  'manage:ai': 'Gerenciar IA',
  'view:campaigns': 'Visualizar Campanhas',
  'manage:campaigns': 'Gerenciar Campanhas',
  'view:integrations': 'Visualizar Integrações',
  'manage:integrations': 'Gerenciar Integrações',
  'view:audit': 'Visualizar Auditoria',
  'manage:members': 'Gerenciar Membros',
  'manage:organization': 'Gerenciar Organização',
  'manage:settings': 'Gerenciar Configurações',
  'view:leads': 'Visualizar Leads',
  'manage:leads': 'Gerenciar Leads',
  'view:tickets': 'Visualizar Tickets',
  'manage:tickets': 'Gerenciar Tickets',
  'view:sales': 'Visualizar Vendas',
  'manage:sales': 'Gerenciar Vendas',
  'view:items': 'Visualizar Itens',
  'manage:items': 'Gerenciar Itens',
  'view:meta': 'Visualizar Meta Ads',
  'manage:meta': 'Gerenciar Meta Ads',
}

function normalizeRole(role: string | null | undefined): RoleName | null {
  const normalized = ROLE_DEFINITIONS.find((definition) => definition.name === role)?.name
  return normalized ?? null
}

export function getPermissionCandidates(permission: Permission): Permission[] {
  return [permission]
}

export function isSystemRoleKey(value: string | null | undefined): value is RoleName {
  return SYSTEM_ROLE_KEYS.includes(value as RoleName)
}

export function getDefaultPermissionsForRole(roleKey: RoleName): Permission[] {
  const definition = ROLE_DEFINITIONS.find((item) => item.name === roleKey)
  return definition ? [...definition.permissions] : []
}

export function getPlatformPermissions(options?: { includeHidden?: boolean }): Permission[] {
  if (options?.includeHidden) {
    return [...ALL_PLATFORM_PERMISSIONS]
  }

  return ALL_PLATFORM_PERMISSIONS.filter(
    (permission) => !HIDDEN_PLATFORM_PERMISSIONS.includes(permission)
  )
}

export function getPermissionLabel(permission: Permission | string): string {
  return PERMISSION_LABELS[permission as Permission] ?? permission
}

export function getRoleDefinitions() {
  return ROLE_DEFINITIONS
}

export function hasRole(userRole: string | null | undefined, requiredRole: RoleName): boolean {
  const normalized = normalizeRole(userRole)
  if (!normalized) return false
  return ROLE_PRIORITY.indexOf(normalized) <= ROLE_PRIORITY.indexOf(requiredRole)
}

export function isOwner(userRole: string | null | undefined): boolean {
  return normalizeRole(userRole) === 'owner'
}

export function isAdmin(userRole: string | null | undefined): boolean {
  const normalized = normalizeRole(userRole)
  if (!normalized) return false
  return normalized === 'admin' || normalized === 'owner'
}

export function hasPermission(userRole: string | null | undefined, permission: Permission): boolean {
  const normalized = normalizeRole(userRole)
  if (!normalized) return false
  const roleDefinition = ROLE_DEFINITIONS.find((definition) => definition.name === normalized)

  return roleDefinition?.permissions.includes(permission) ?? false
}

export function hasAnyPermission(
  userRole: string | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(userRole, permission))
}

export function hasAllPermissions(
  userRole: string | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(userRole, permission))
}

export function canAccessResource(
  userRole: string | null | undefined,
  resourcePermission: Permission
): boolean {
  return hasPermission(userRole, resourcePermission)
}

export function getHighestRole(currentRole: string | null | undefined): UserRoleType {
  return normalizeRole(currentRole) ?? 'user'
}
