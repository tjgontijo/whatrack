import { UserRole } from '@prisma/client'

export type Permission =
    | 'system:manage'         // Super Admin only
    | 'system:read_logs'      // Access to global webhook logs
    | 'org:manage'            // Manage organization settings
    | 'org:whatsapp:manage'   // Manage WhatsApp configs
    | 'org:leads:manage'      // Manage leads
    | 'org:sales:manage'      // Manage sales
    | 'org:members:manage'    // Manage organization members

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    [UserRole.owner]: [
        'system:manage',
        'system:read_logs',
        'org:manage',
        'org:whatsapp:manage',
        'org:leads:manage',
        'org:sales:manage',
        'org:members:manage',
    ],
    [UserRole.admin]: [
        'system:read_logs',
        'org:manage',
        'org:whatsapp:manage',
        'org:leads:manage',
        'org:sales:manage',
        'org:members:manage',
    ],
    [UserRole.user]: [
        'org:leads:manage',
        'org:sales:manage',
    ],
}

// Hierarquia de pesos para comparação (maior = mais poder)
export const ROLE_WEIGHTS: Record<UserRole, number> = {
    [UserRole.user]: 0,
    [UserRole.admin]: 5,
    [UserRole.owner]: 10,
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
    isSuperAdmin: (role: string | null | undefined) => hasRequiredRole(role, UserRole.owner),
    isSystemAdmin: (role: string | null | undefined) => hasRequiredRole(role, UserRole.admin),
    canViewSystemLogs: (role: string | null | undefined) => hasGlobalPermission(role, 'system:read_logs'),
}
