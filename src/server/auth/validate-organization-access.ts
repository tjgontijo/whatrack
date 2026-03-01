import { cookies } from 'next/headers'

import { auth } from '@/lib/auth/auth'
import { getPermissionCandidates, isAdmin, isOwner, type Permission } from '@/lib/auth/rbac/roles'
import { prisma } from '@/lib/db/prisma'
import { ORGANIZATION_COOKIE, ORGANIZATION_HEADER } from '@/lib/constants/http-headers'
import {
  INTEGRATION_IDENTITY_REQUIRED_MESSAGE,
  isOrganizationIdentityComplete,
  requiresIdentityForIntegrationPath,
} from '@/server/organization/is-identity-complete'
import { listEffectivePermissionsForUser } from '@/server/organization/organization-rbac.service'
import { logger } from '@/lib/utils/logger'

async function buildAuthHeaders(request?: Request): Promise<Headers> {
  if (request) {
    const headers = new Headers(request.headers)
    if (!headers.get('cookie')) {
      try {
        const cookieStore = await cookies()
        const cookieHeader = cookieStore
          .getAll()
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join('; ')

        if (cookieHeader) {
          headers.set('cookie', cookieHeader)
        }
      } catch {
        // ignore
      }
    }
    return headers
  }

  const cookieStore = await cookies()
  const headers = new Headers()

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')

  if (cookieHeader) {
    headers.set('cookie', cookieHeader)
  }

  return headers
}

async function getSessionFromRequest(request: Request) {
  const headers = await buildAuthHeaders(request)
  return auth.api.getSession({ headers })
}

interface ValidationResult {
  hasAccess: boolean
  error?: string
  role?: string
  memberId?: string
}

export async function validateOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<ValidationResult> {
  try {
    const member = await prisma.member.findFirst({
      where: {
        userId,
        organizationId,
      },
      select: {
        id: true,
        role: true,
      },
    })

    if (!member) {
      return {
        hasAccess: false,
        error: 'Usuário não é membro desta organização',
      }
    }

    return { hasAccess: true, role: member.role, memberId: member.id }
  } catch (error) {
    logger.error({ err: error }, '[validateOrganizationAccess] Erro')
    return {
      hasAccess: false,
      error: 'Erro ao validar acesso',
    }
  }
}

export function extractOrganizationId(request: Request): string | null {
  // 1. Check Header
  const fromHeaders = request.headers.get(ORGANIZATION_HEADER)
  if (fromHeaders) return fromHeaders

  // 2. Check Search Params
  try {
    const url = new URL(request.url)
    const fromParams = url.searchParams.get('organizationId') || url.searchParams.get('orgId')
    if (fromParams) return fromParams
  } catch { }

  // 3. Check Cookie (last resort)
  try {
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`${ORGANIZATION_COOKIE}=([^;]+)`))
      if (match) return match[1]
    }
  } catch { }

  return null
}

interface FullAccessResult {
  hasAccess: boolean
  userId?: string
  organizationId?: string
  role?: string
  memberId?: string
  globalRole?: string
  error?: string
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

export async function validateTenantAccess(
  request: Request,
  requiredPermissions?: Permission | Permission[]
): Promise<FullAccessResult> {
  try {
    const session = await getSessionFromRequest(request)

    if (!session) {
      return {
        hasAccess: false,
        error: 'Usuário não autenticado',
      }
    }

    const userId = session.user.id
    const globalRole = session.user.role ?? undefined
    const organizationId =
      session.session?.activeOrganizationId ?? extractOrganizationId(request) ?? undefined

    if (!organizationId) {
      return {
        hasAccess: false,
        userId,
        error: 'Organização não especificada',
      }
    }

    const validation = await validateOrganizationAccess(userId, organizationId)
    logger.debug({ context: validation }, '[validateTenantAccess] Validation result')

    if (!validation.hasAccess || !validation.role) {
      return {
        hasAccess: false,
        userId,
        organizationId,
        memberId: validation.memberId,
        error: validation.error,
      }
    }

    const permissions = ensureArray(requiredPermissions)
    if (permissions.length > 0) {
      const effective = await listEffectivePermissionsForUser({
        userId,
        organizationId,
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
        return {
          hasAccess: false,
          userId,
          organizationId,
          role: validation.role,
          memberId: validation.memberId,
          globalRole,
          error: `Permissão insuficiente (${missing.join(', ')})`,
        }
      }
    }

    const pathname = getRequestPathname(request)
    if (requiresIdentityForIntegrationPath(pathname)) {
      const identityComplete = await isOrganizationIdentityComplete(organizationId)
      if (!identityComplete) {
        return {
          hasAccess: false,
          userId,
          organizationId,
          role: validation.role,
          memberId: validation.memberId,
          globalRole,
          error: INTEGRATION_IDENTITY_REQUIRED_MESSAGE,
        }
      }
    }

    return {
      hasAccess: true,
      userId,
      organizationId,
      role: validation.role,
      memberId: validation.memberId,
      globalRole,
    }
  } catch (error) {
    logger.error({ err: error }, '[validateTenantAccess] Erro ao validar sessão')
    return {
      hasAccess: false,
      error: 'Erro ao validar acesso',
    }
  }
}

export async function validateFullAccess(request: Request): Promise<FullAccessResult> {
  return validateTenantAccess(request)
}

export async function validatePermissionAccess(
  request: Request,
  requiredPermissions: Permission | Permission[]
): Promise<FullAccessResult> {
  return validateTenantAccess(request, requiredPermissions)
}

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
