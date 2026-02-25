import { auth } from '@/lib/auth/auth'
import { ORGANIZATION_HEADER, TEAM_HEADER } from '@/lib/constants/http-headers'
import { getPermissionCandidates, isAdmin, isOwner, type Permission } from '@/lib/auth/rbac/roles'
import { cookies } from 'next/headers'
import { listEffectivePermissionsForUser } from '@/server/organization/organization-rbac.service'
import { prisma } from '@/lib/db/prisma'
import {
  INTEGRATION_IDENTITY_REQUIRED_MESSAGE,
  isOrganizationIdentityComplete,
  requiresIdentityForIntegrationPath,
} from '@/server/organization/is-identity-complete'

async function getSessionFromRequest(request: Request) {
  const headers = new Headers(request.headers)
  if (!headers.get('cookie')) {
    try {
      const cookieStore = await cookies()
      const cookieHeader = cookieStore
        .getAll()
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join('; ')
      if (cookieHeader) headers.set('cookie', cookieHeader)
    } catch {
      // ignore
    }
  }
  return auth.api.getSession({ headers })
}

interface ValidationResult {
  hasAccess: boolean
  error?: string
  role?: string
  memberId?: string
}

/**
 * Valida se um usuário tem acesso a uma organização específica
 * Verifica se o usuário é membro da organização
 */
export async function validateTeamAccess(
  userId: string,
  teamId: string
): Promise<ValidationResult> {
  try {
    // Team access is backed by the current organization membership table.
    const member = await prisma.member.findFirst({
      where: {
        userId,
        organizationId: teamId,
      },
      select: {
        id: true,
        role: true,
      },
    })

    if (!member) {
      return {
        hasAccess: false,
        error: 'Usuário não é membro desta equipe',
      }
    }

    return { hasAccess: true, role: member.role, memberId: member.id }
  } catch (error) {
    console.error('[validateTeamAccess] Erro:', error)
    return {
      hasAccess: false,
      error: 'Erro ao validar acesso',
    }
  }
}

/**
 * Backward-compatible alias.
 */
export async function validateOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<ValidationResult> {
  return validateTeamAccess(userId, organizationId)
}

/**
 * Extracts active team id from headers.
 * Accepts canonical x-team-id and legacy x-organization-id.
 */
export function extractTeamId(request: Request): string | null {
  const fromHeaders = request.headers.get(TEAM_HEADER) ?? request.headers.get(ORGANIZATION_HEADER)
  if (fromHeaders) return fromHeaders

  try {
    const url = new URL(request.url)
    return url.searchParams.get('teamId') ?? url.searchParams.get('organizationId')
  } catch {
    return null
  }
}

/**
 * Backward-compatible alias for legacy callers.
 */
export function extractOrganizationId(request: Request): string | null {
  return extractTeamId(request)
}

interface FullAccessResult {
  hasAccess: boolean
  userId?: string
  teamId?: string
  organizationId?: string
  role?: string
  memberId?: string
  globalRole?: string
  error?: string
}

function withLegacyIds(input: {
  hasAccess: boolean
  userId?: string
  teamId?: string
  role?: string
  memberId?: string
  globalRole?: string
  error?: string
}): FullAccessResult {
  return {
    hasAccess: input.hasAccess,
    userId: input.userId,
    teamId: input.teamId,
    organizationId: input.teamId,
    role: input.role,
    memberId: input.memberId,
    globalRole: input.globalRole,
    error: input.error,
  }
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function getRequestPathname(request: Request): string {
  try {
    return new URL(request.url).pathname
  } catch {
    return ''
  }
}

/**
 * Team-first authorization entrypoint.
 * Validates session + active team membership + optional permission checks.
 */
export async function validateTenantAccess(
  request: Request,
  requiredPermissions?: Permission | Permission[]
): Promise<FullAccessResult> {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return withLegacyIds({
        hasAccess: false,
        error: 'Usuário não autenticado',
      })
    }

    const userId = session.user.id
    const globalRole = session.user.role ?? undefined
    const teamId = session.session?.activeOrganizationId ?? extractTeamId(request) ?? undefined

    if (!teamId) {
      return withLegacyIds({
        hasAccess: false,
        userId,
        error: 'Equipe não especificada',
      })
    }

    const validation = await validateTeamAccess(userId, teamId)

    if (!validation.hasAccess || !validation.role) {
      return withLegacyIds({
        hasAccess: false,
        userId,
        teamId,
        memberId: validation.memberId,
        error: validation.error,
      })
    }

    const permissions = ensureArray(requiredPermissions)
    if (permissions.length > 0) {
      const effective = await listEffectivePermissionsForUser({
        userId,
        organizationId: teamId,
      })

      const effectiveSet = new Set(effective?.effectivePermissions ?? [])
      const denySet = new Set(effective?.denyOverrides ?? [])
      const missing = permissions.filter((permission) => {
        const candidates = getPermissionCandidates(permission)
        if (candidates.some((candidate) => denySet.has(candidate))) {
          return true
        }
        return !candidates.some((candidate) => effectiveSet.has(candidate))
      })

      if (missing.length > 0) {
        return withLegacyIds({
          hasAccess: false,
          userId,
          teamId,
          role: validation.role,
          memberId: validation.memberId,
          globalRole,
          error: `Permissão insuficiente (${missing.join(', ')})`,
        })
      }
    }

    const pathname = getRequestPathname(request)
    if (requiresIdentityForIntegrationPath(pathname)) {
      const identityComplete = await isOrganizationIdentityComplete(teamId)
      if (!identityComplete) {
        return withLegacyIds({
          hasAccess: false,
          userId,
          teamId,
          role: validation.role,
          memberId: validation.memberId,
          globalRole,
          error: INTEGRATION_IDENTITY_REQUIRED_MESSAGE,
        })
      }
    }

    return withLegacyIds({
      hasAccess: true,
      userId,
      teamId,
      role: validation.role,
      memberId: validation.memberId,
      globalRole,
    })
  } catch (error) {
    console.error('[validateTenantAccess] Erro ao validar sessão:', error)
    return withLegacyIds({
      hasAccess: false,
      error: 'Erro ao validar acesso',
    })
  }
}

/**
 * Valida acesso completo: usuário autenticado + membro da organização
 * Retorna também o role do membro para verificações de permissão
 */
export async function validateFullAccess(request: Request): Promise<FullAccessResult> {
  return validateTenantAccess(request)
}

/**
 * Valida acesso completo + permissões de tenant.
 */
export async function validatePermissionAccess(
  request: Request,
  requiredPermissions: Permission | Permission[]
): Promise<FullAccessResult> {
  return validateTenantAccess(request, requiredPermissions)
}

/**
 * Valida acesso de administrador: usuário autenticado + membro com role owner ou admin
 * Usado para rotas que requerem privilégios administrativos (billing, settings, etc)
 */
export async function validateAdminAccess(request: Request): Promise<FullAccessResult> {
  const access = await validateTenantAccess(request)

  if (!access.hasAccess) {
    return access
  }

  if (!isAdmin(access.role)) {
    return {
      hasAccess: false,
      error: 'Acesso restrito a administradores',
    }
  }

  return access
}

/**
 * Valida acesso de proprietário: usuário autenticado + membro com role owner
 * Usado para rotas que requerem privilégios máximos (delete org, transfer ownership, etc)
 */
export async function validateOwnerAccess(request: Request): Promise<FullAccessResult> {
  const access = await validateTenantAccess(request)

  if (!access.hasAccess) {
    return access
  }

  if (!isOwner(access.role)) {
    return {
      hasAccess: false,
      error: 'Acesso restrito ao proprietário',
    }
  }

  return access
}
