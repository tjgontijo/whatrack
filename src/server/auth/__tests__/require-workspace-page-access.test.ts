import { beforeEach, describe, expect, it, vi } from 'vitest'

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  })
)
const getServerSessionMock = vi.hoisted(() => vi.fn())
const resolveDefaultWorkspacePathMock = vi.hoisted(() => vi.fn())
const validateOrganizationAccessMock = vi.hoisted(() => vi.fn())
const listEffectivePermissionsForUserMock = vi.hoisted(() => vi.fn())
const resolveOrganizationContextMock = vi.hoisted(() => vi.fn())

vi.mock('server-only', () => ({}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('@/server/auth/server-session', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/server/navigation/resolve-default-workspace-path', () => ({
  resolveDefaultWorkspacePath: resolveDefaultWorkspacePathMock,
}))

vi.mock('@/server/auth/validate-organization-access', () => ({
  validateOrganizationAccess: validateOrganizationAccessMock,
}))

vi.mock('@/server/organization/organization-rbac.service', () => ({
  listEffectivePermissionsForUser: listEffectivePermissionsForUserMock,
}))

vi.mock('@/server/project/resolve-project-context', () => ({
  resolveOrganizationContext: resolveOrganizationContextMock,
}))

import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

describe('requireWorkspacePageAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveDefaultWorkspacePathMock.mockResolvedValue('/fallback-org/fallback-project')
  })

  it('uses the organization from the current route when organizationSlug is provided', async () => {
    getServerSessionMock.mockResolvedValueOnce({
      user: {
        id: 'user-1',
        role: 'owner',
      },
      session: {
        activeOrganizationId: 'org-from-session',
      },
    })
    resolveOrganizationContextMock.mockResolvedValueOnce({
      organizationId: 'org-from-route',
      organizationSlug: 'elev8',
      organizationName: 'Elev8',
      organizationLogo: null,
    })
    validateOrganizationAccessMock.mockResolvedValueOnce({
      hasAccess: true,
      role: 'owner',
      memberId: 'member-1',
    })
    listEffectivePermissionsForUserMock.mockResolvedValueOnce({
      effectivePermissions: ['manage:integrations'],
      denyOverrides: [],
    })

    const result = await requireWorkspacePageAccess({
      organizationSlug: 'elev8',
      permissions: 'manage:integrations',
    })

    expect(resolveOrganizationContextMock).toHaveBeenCalledWith({
      organizationSlug: 'elev8',
      userId: 'user-1',
    })
    expect(validateOrganizationAccessMock).toHaveBeenCalledWith('user-1', 'org-from-route')
    expect(listEffectivePermissionsForUserMock).toHaveBeenCalledWith({
      userId: 'user-1',
      organizationId: 'org-from-route',
    })
    expect(result).toMatchObject({
      userId: 'user-1',
      organizationId: 'org-from-route',
      memberId: 'member-1',
      role: 'owner',
      globalRole: 'owner',
    })
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('redirects to the default workspace when the route organization is not accessible', async () => {
    getServerSessionMock.mockResolvedValueOnce({
      user: {
        id: 'user-1',
        role: 'user',
      },
      session: {
        activeOrganizationId: 'org-from-session',
      },
    })
    resolveOrganizationContextMock.mockResolvedValueOnce(null)

    await expect(
      requireWorkspacePageAccess({
        organizationSlug: 'other-org',
      })
    ).rejects.toThrow('REDIRECT:/fallback-org/fallback-project')

    expect(resolveOrganizationContextMock).toHaveBeenCalledWith({
      organizationSlug: 'other-org',
      userId: 'user-1',
    })
    expect(validateOrganizationAccessMock).not.toHaveBeenCalled()
    expect(redirectMock).toHaveBeenCalledWith('/fallback-org/fallback-project')
  })
})
