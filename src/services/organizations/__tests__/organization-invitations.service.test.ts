import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  member: {
    findFirst: vi.fn(),
  },
  invitation: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
}))

const rbacServiceMock = vi.hoisted(() => ({
  getOrganizationRoleByKey: vi.fn(),
}))

const permissionPolicyMock = vi.hoisted(() => ({
  assertCanDelegatePermissions: vi.fn(),
}))

const auditServiceMock = vi.hoisted(() => ({
  log: vi.fn(),
}))

const resendProviderMock = vi.hoisted(() => ({
  send: vi.fn(),
}))

const emailTemplateMock = vi.hoisted(() => ({
  generateInvitationEmail: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/server/organization/organization-rbac.service', () => rbacServiceMock)
vi.mock('@/server/organization/permission-delegation-policy', () => permissionPolicyMock)
vi.mock('@/services/audit/audit.service', () => ({ auditService: auditServiceMock }))
vi.mock('@/services/mail/resend', () => ({ resendProvider: resendProviderMock }))
vi.mock('@/services/mail/templates/InvitationEmail', () => emailTemplateMock)
vi.mock('@/lib/env/require-env', () => ({
  requireEnv: vi.fn(() => 'http://localhost:3000'),
}))

import {
  createOrganizationInvitation,
  resendOrganizationInvitation,
} from '@/services/organizations/organization-invitations.service'

describe('organization-invitations.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns conflict when there is already a pending invitation', async () => {
    rbacServiceMock.getOrganizationRoleByKey.mockResolvedValueOnce({
      key: 'user',
      permissions: [{ permissionKey: 'view:dashboard' }],
    })
    prismaMock.member.findFirst.mockResolvedValueOnce(null)
    prismaMock.invitation.findFirst.mockResolvedValueOnce({ id: 'inv-1' })

    const result = await createOrganizationInvitation({
      organizationId: 'org-1',
      actorUserId: 'actor-1',
      actorRole: 'owner',
      actorGlobalRole: 'owner',
      data: { email: 'foo@bar.com', role: 'user' },
    })

    expect(result).toEqual({
      error: 'Já existe um convite pendente para este e-mail.',
      status: 409,
    })
  })

  it('returns 502 when resend email fails', async () => {
    prismaMock.invitation.findFirst.mockResolvedValueOnce({
      id: 'inv-1',
      email: 'foo@bar.com',
      role: 'user',
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    rbacServiceMock.getOrganizationRoleByKey.mockResolvedValueOnce({
      key: 'user',
      permissions: [{ permissionKey: 'view:dashboard' }],
    })
    prismaMock.user.findUnique.mockResolvedValueOnce({
      name: 'Owner',
      email: 'owner@bar.com',
    })
    prismaMock.organization.findUnique.mockResolvedValueOnce({ name: 'Org A' })
    prismaMock.invitation.update.mockResolvedValueOnce({
      id: 'inv-1',
      email: 'foo@bar.com',
      role: 'user',
      status: 'pending',
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
    })
    emailTemplateMock.generateInvitationEmail.mockResolvedValueOnce({
      subject: 'Invite',
      html: '<p>invite</p>',
      text: 'invite',
    })
    resendProviderMock.send.mockResolvedValueOnce({
      success: false,
      provider: 'resend',
      error: new Error('send failed'),
    })

    const result = await resendOrganizationInvitation({
      organizationId: 'org-1',
      actorUserId: 'actor-1',
      actorRole: 'owner',
      actorGlobalRole: 'owner',
      invitationId: 'inv-1',
    })

    expect(result).toEqual({
      error: 'Não foi possível reenviar o convite no momento.',
      status: 502,
    })
  })
})
