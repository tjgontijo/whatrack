import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/auth'
import { isOwner, isAdmin, type RoleName } from '@/lib/auth/rbac/roles'

interface ValidationResult {
  hasAccess: boolean
  error?: string
  role?: RoleName
}

/**
 * Valida se um usuário tem acesso a uma organização específica
 * Verifica se o usuário é membro da organização
 */
export async function validateOrganizationAccess(
  userId: string,
  organizationId: string,
): Promise<ValidationResult> {
  try {
    // Verificar se o usuário é membro da organização
    const member = await prisma.member.findFirst({
      where: {
        userId,
        organizationId,
      },
      select: {
        role: true,
      },
    })

    if (!member) {
      return {
        hasAccess: false,
        error: 'Usuário não é membro desta organização',
      }
    }

    return { hasAccess: true, role: member.role as RoleName }
  } catch (error) {
    console.error('[validateOrganizationAccess] Erro:', error)
    return {
      hasAccess: false,
      error: 'Erro ao validar acesso',
    }
  }
}

/**
 * Extrai e valida o organizationId do header
 */
export function extractOrganizationId(request: Request): string | null {
  const organizationId = request.headers.get('x-organization-id')
  return organizationId
}

interface FullAccessResult {
  hasAccess: boolean
  userId?: string
  organizationId?: string
  role?: RoleName
  error?: string
}

/**
 * Valida acesso completo: usuário autenticado + membro da organização
 * Retorna também o role do membro para verificações de permissão
 */
export async function validateFullAccess(
  request: Request,
): Promise<FullAccessResult> {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      return {
        hasAccess: false,
        error: 'Usuário não autenticado',
      }
    }

    const userId = session.user.id
    const organizationId =
      extractOrganizationId(request) ?? session.session?.activeOrganizationId ?? undefined

    if (!organizationId) {
      return {
        hasAccess: false,
        error: 'Organização não especificada',
      }
    }

    const validation = await validateOrganizationAccess(userId, organizationId)

    if (!validation.hasAccess) {
      return {
        hasAccess: false,
        error: validation.error,
      }
    }

    return {
      hasAccess: true,
      userId,
      organizationId,
      role: validation.role,
    }
  } catch (error) {
    console.error('[validateFullAccess] Erro ao validar sessão:', error)
    return {
      hasAccess: false,
      error: 'Erro ao validar acesso',
    }
  }
}

/**
 * Valida acesso de administrador: usuário autenticado + membro com role owner ou admin
 * Usado para rotas que requerem privilégios administrativos (billing, settings, etc)
 */
export async function validateAdminAccess(
  request: Request,
): Promise<FullAccessResult> {
  const access = await validateFullAccess(request)

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
export async function validateOwnerAccess(
  request: Request,
): Promise<FullAccessResult> {
  const access = await validateFullAccess(request)

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
