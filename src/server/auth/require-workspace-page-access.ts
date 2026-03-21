import { redirect } from 'next/navigation'

import { getPermissionCandidates, isAdmin, isOwner, type Permission } from '@/lib/auth/rbac/roles'
import { getServerSession } from '@/server/auth/server-session'
import { resolveDefaultWorkspacePath } from '@/server/navigation/resolve-default-workspace-path'
import { validateOrganizationAccess } from '@/server/auth/validate-organization-access'
import { listEffectivePermissionsForUser } from '@/server/organization/organization-rbac.service'
import { resolveOrganizationContext } from '@/server/project/resolve-project-context'

type RequireWorkspacePageAccessOptions = {
  permissions?: Permission | Permission[]
  requireAdmin?: boolean
  requireOwner?: boolean
  organizationSlug?: string
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

  let activeOrganizationId = session.session?.activeOrganizationId ?? null

  if (options.organizationSlug) {
    const routeOrganization = await resolveOrganizationContext({
      organizationSlug: options.organizationSlug,
      userId: session.user.id,
    })
    const routeOrganizationId = routeOrganization?.organizationId ?? null

    if (!routeOrganizationId) {
      await redirectToDefaultWorkspace(session.user.id)
    }

    activeOrganizationId = routeOrganizationId
  }

  if (!activeOrganizationId) {
    await redirectToDefaultWorkspace(session.user.id)
  }

  const organizationId = activeOrganizationId as string
  const validation = await validateOrganizationAccess(session.user.id, organizationId)

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
      await redirectToDefaultWorkspace(session.user.id)
    }
  }

  return {
    userId: session.user.id,
    organizationId,
    memberId,
    role,
    globalRole: session.user.role ?? undefined,
  }
}
