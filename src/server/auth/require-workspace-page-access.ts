import { redirect } from 'next/navigation'

import { getPermissionCandidates, isAdmin, isOwner, type Permission } from '@/lib/auth/rbac/roles'
import { getServerSession } from '@/server/auth/server-session'
import { validateOrganizationAccess } from '@/server/auth/validate-organization-access'
import { listEffectivePermissionsForUser } from '@/server/organization/organization-rbac.service'

type RequireWorkspacePageAccessOptions = {
  permissions?: Permission | Permission[]
  requireAdmin?: boolean
  requireOwner?: boolean
}

type WorkspacePageAccess = {
  userId: string
  organizationId: string
  memberId: string
  role: string
  globalRole?: string
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export async function requireWorkspacePageAccess(
  options: RequireWorkspacePageAccessOptions = {}
): Promise<WorkspacePageAccess> {
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const organizationId = session.session?.activeOrganizationId

  if (!organizationId) {
    redirect('/dashboard')
  }

  const validation = await validateOrganizationAccess(session.user.id, organizationId)

  if (!validation.hasAccess || !validation.role || !validation.memberId) {
    redirect('/dashboard')
  }

  if (options.requireOwner && !isOwner(validation.role)) {
    redirect('/dashboard')
  }

  if (options.requireAdmin && !isAdmin(validation.role)) {
    redirect('/dashboard')
  }

  const requiredPermissions = toArray(options.permissions)

  if (requiredPermissions.length > 0) {
    const effective = await listEffectivePermissionsForUser({
      userId: session.user.id,
      organizationId,
    })

    const effectiveSet = new Set(effective?.effectivePermissions ?? [])
    const denySet = new Set(effective?.denyOverrides ?? [])
    const missing = requiredPermissions.filter((permission) => {
      const candidates = getPermissionCandidates(permission)

      if (candidates.some((candidate) => denySet.has(candidate))) {
        return true
      }

      return !candidates.some((candidate) => effectiveSet.has(candidate))
    })

    if (missing.length > 0) {
      redirect('/dashboard')
    }
  }

  return {
    userId: session.user.id,
    organizationId,
    memberId: validation.memberId,
    role: validation.role,
    globalRole: session.user.role ?? undefined,
  }
}
