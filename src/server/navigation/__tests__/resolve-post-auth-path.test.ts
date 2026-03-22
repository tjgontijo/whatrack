import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveDefaultWorkspacePathMock = vi.hoisted(() => vi.fn())

vi.mock('@/server/navigation/resolve-default-workspace-path', () => ({
  resolveDefaultWorkspacePath: resolveDefaultWorkspacePathMock,
}))

import { resolvePostSignInPath } from '@/server/navigation/resolve-post-auth-path'

describe('resolvePostSignInPath', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an explicit next path without consulting the workspace', async () => {
    const result = await resolvePostSignInPath({
      userId: 'user-1',
      nextParam: '/acme/projeto-a/settings',
      intent: {},
    })

    expect(resolveDefaultWorkspacePathMock).not.toHaveBeenCalled()
    expect(result).toBe('/acme/projeto-a/settings')
  })

  it('returns the default workspace path when the user already has organization and project', async () => {
    resolveDefaultWorkspacePathMock.mockResolvedValueOnce('/acme/projeto-a')

    const result = await resolvePostSignInPath({
      userId: 'user-1',
      nextParam: null,
      intent: {},
    })

    expect(resolveDefaultWorkspacePathMock).toHaveBeenCalledWith('user-1')
    expect(result).toBe('/acme/projeto-a')
  })

  it('falls back to welcome with funnel intent when no workspace exists', async () => {
    resolveDefaultWorkspacePathMock.mockResolvedValueOnce(null)

    const result = await resolvePostSignInPath({
      userId: 'user-1',
      nextParam: null,
      intent: { intent: 'start-trial', source: 'hero' },
    })

    expect(result).toBe('/welcome?intent=start-trial&source=hero')
  })
})
