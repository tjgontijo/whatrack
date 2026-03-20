import { redirect } from 'next/navigation'

import { getPermissionCandidates, isAdmin, isOwner, type Permission } from '@/lib/auth/rbac/roles'
import { getServerSession } from '@/server/auth/server-session'
import { resolveDefaultWorkspacePath } from '@/server/navigation/resolve-default-workspace-path'
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

async function redirectToDefaultWorkspace(userId: string): Promise<never> {
  const fallbackPath = await resolveDefaultWorkspacePath(userId)
  redirect(fallbackPath ?? '/welcome')
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
    await redirectToDefaultWorkspace(session.user.id)
  }

  const activeOrganizationId = organizationId as string
  const validation = await validateOrganizationAccess(session.user.id, activeOrganizationId)

  if (!validation.hasAccess || !validation.role || !validation.memberId) {
    await redirectToDefaultWorkspace(session.user.id)
  }

  if (options.requireOwner && !isOwner(validation.role)) {
    await redirectToDefaultWorkspace(session.user.id)
  }

  if (options.requireAdmin && !isAdmin(validation.role)) {
    await redirectToDefaultWorkspace(session.user.id)
  }

  const memberId = validation.memberId as string
  const role = validation.role as string

  const requiredPermissions = toArray(options.permissions)

  if (requiredPermissions.length > 0) {
    const effective = await listEffectivePermissionsForUser({
      userId: session.user.id,
      organizationId: activeOrganizationId,
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
      await redirectToDefaultWorkspace(session.user.id)
    }
  }

  return {
    userId: session.user.id,
    organizationId: activeOrganizationId,
    memberId,
    role,
    globalRole: session.user.role ?? undefined,
  }
}
