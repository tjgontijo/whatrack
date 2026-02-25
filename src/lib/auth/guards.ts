import { NextRequest, NextResponse } from 'next/server'
import { auth } from './auth'
import { isOwner, hasPermission, Permission, RoleName } from './rbac/roles'

export interface AuthenticatedUser {
  id: string
  email: string
  role: RoleName
  activeOrganizationId: string | null
  activeTeamId: string | null
}

/**
 * Middleware base para garantir autenticação
 */
export async function requireAuth(request: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role as RoleName,
    activeOrganizationId: session.session.activeOrganizationId || null,
    activeTeamId: session.session.activeOrganizationId || null,
  }
}

/**
 * Requer que o usuário seja um Super Admin (Global Role: owner)
 */
export async function requireSuperAdmin(
  request: NextRequest
): Promise<AuthenticatedUser | NextResponse> {
  const user = await requireAuth(request)

  if (user instanceof NextResponse) return user

  if (!isOwner(user.role)) {
    return NextResponse.json({ error: 'Forbidden - Super Admin required' }, { status: 403 })
  }

  return user
}

/**
 * Requer uma permissão global específica
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<AuthenticatedUser | NextResponse> {
  const user = await requireAuth(request)

  if (user instanceof NextResponse) return user

  if (!hasPermission(user.role, permission)) {
    return NextResponse.json(
      { error: `Forbidden - Missing permission: ${permission}` },
      { status: 403 }
    )
  }

  return user
}

/**
 * Requer que o usuário pertença a uma organização ativa
 */
export async function requireOrganization(
  request: NextRequest
): Promise<
  (AuthenticatedUser & { activeTeamId: string; activeOrganizationId: string }) | NextResponse
> {
  const user = await requireAuth(request)

  if (user instanceof NextResponse) return user

  if (!user.activeOrganizationId) {
    return NextResponse.json({ error: 'No active organization selected' }, { status: 400 })
  }

  return {
    ...user,
    activeOrganizationId: user.activeOrganizationId,
    activeTeamId: user.activeOrganizationId,
  }
}

/**
 * Backward-compatible alias.
 */
export async function requireTeam(
  request: NextRequest
): Promise<
  (AuthenticatedUser & { activeTeamId: string; activeOrganizationId: string }) | NextResponse
> {
  return requireOrganization(request)
}
