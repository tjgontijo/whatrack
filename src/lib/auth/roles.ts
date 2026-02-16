export const USER_ROLE = {
    owner: 'owner',
    admin: 'admin',
    user: 'user',
} as const

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE]

export type Permission =
    | 'system:manage'         // Super Admin only
    | 'system:read_logs'      // Access to global webhook logs
    | 'org:manage'            // Manage organization settings
    | 'org:whatsapp:manage'   // Manage WhatsApp configs
    | 'org:leads:manage'      // Manage leads
    | 'org:sales:manage'      // Manage sales
    | 'org:members:manage'    // Manage organization members

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    [USER_ROLE.owner]: [
        'system:manage',
        'system:read_logs',
        'org:manage',
        'org:whatsapp:manage',
        'org:leads:manage',
        'org:sales:manage',
        'org:members:manage',
    ],
    [USER_ROLE.admin]: [
        'system:read_logs',
        'org:manage',
        'org:whatsapp:manage',
        'org:leads:manage',
        'org:sales:manage',
        'org:members:manage',
    ],
    [USER_ROLE.user]: [
        'org:leads:manage',
        'org:sales:manage',
    ],
}

// Hierarquia de pesos para comparação (maior = mais poder)
export const ROLE_WEIGHTS: Record<UserRole, number> = {
    [USER_ROLE.user]: 0,
    [USER_ROLE.admin]: 5,
    [USER_ROLE.owner]: 10,
}

/**
 * Verifica se o usuário tem a função necessária ou superior
 */
export function hasRequiredRole(userRole: UserRole | string | null | undefined, requiredRole: UserRole): boolean {
    if (!userRole) return false

    const currentRole = userRole as UserRole
    const userWeight = ROLE_WEIGHTS[currentRole] ?? 0
    const requiredWeight = ROLE_WEIGHTS[requiredRole] ?? 0

    return userWeight >= requiredWeight
}

/**
 * Verifica se o usuário tem uma permissão específica com base na sua role global
 */
export function hasGlobalPermission(userRole: UserRole | string | null | undefined, permission: Permission): boolean {
    if (!userRole) return false

    const currentRole = userRole as UserRole
    const permissions = ROLE_PERMISSIONS[currentRole] ?? []

    // 'system:manage' dá acesso total
    if (permissions.includes('system:manage')) return true

    return permissions.includes(permission)
}

/**
 * Helpers específicos para o negócio
 */
export const AuthGuards = {
    isSuperAdmin: (role: string | null | undefined) => hasRequiredRole(role, USER_ROLE.owner),
    isSystemAdmin: (role: string | null | undefined) => hasRequiredRole(role, USER_ROLE.admin),
    canViewSystemLogs: (role: string | null | undefined) => hasGlobalPermission(role, 'system:read_logs'),
}
