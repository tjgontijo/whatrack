import { NextRequest } from 'next/server'

import { auditService } from '@/lib/audit.service'
import { requireEnv } from '@/lib/env/require-env.server'
import { prisma } from '@/lib/prisma'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { legacyOrganizationJson } from '@/server/http/legacy-organization'
import { getOrganizationRoleByKey } from '@/server/organization/organization-rbac.service'
import { assertCanDelegatePermissions } from '@/server/organization/permission-delegation-policy'
import { resendProvider } from '@/services/mail/resend'
import { generateInvitationEmail } from '@/services/mail/templates/InvitationEmail'

const APP_URL = requireEnv('APP_URL')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await validatePermissionAccess(request, 'manage:team_members')
  if (!access.hasAccess || !access.teamId || !access.userId || !access.role) {
    return legacyOrganizationJson(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 },
      '/api/v1/organizations/me/invitations/:id/resend'
    )
  }

  if (access.role !== 'owner' && access.role !== 'admin') {
    return legacyOrganizationJson(
      { error: 'Apenas owner/admin podem reenviar convites.' },
      { status: 403 },
      '/api/v1/organizations/me/invitations/:id/resend'
    )
  }

  const { id } = await params

  const invitation = await prisma.invitation.findFirst({
    where: {
      id,
      organizationId: access.teamId,
      status: 'pending',
    },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
    },
  })

  if (!invitation) {
    return legacyOrganizationJson(
      { error: 'Convite pendente não encontrado.' },
      { status: 404 },
      '/api/v1/organizations/me/invitations/:id/resend'
    )
  }

  if (invitation.role === 'owner' && access.role !== 'owner') {
    return legacyOrganizationJson(
      { error: 'Somente owner pode reenviar convite de owner.' },
      { status: 403 },
      '/api/v1/organizations/me/invitations/:id/resend'
    )
  }

  if (access.role === 'admin' && invitation.role && !['user', 'admin'].includes(invitation.role)) {
    return legacyOrganizationJson(
      { error: 'Admin pode reenviar apenas convites de user/admin.' },
      { status: 403 },
      '/api/v1/organizations/me/invitations/:id/resend'
    )
  }

  const selectedRole = await getOrganizationRoleByKey(access.teamId, invitation.role || 'user')
  if (!selectedRole) {
    return legacyOrganizationJson(
      { error: 'Papel do convite não encontrado para esta organização.' },
      { status: 404 },
      '/api/v1/organizations/me/invitations/:id/resend'
    )
  }

  try {
    assertCanDelegatePermissions(
      access.globalRole,
      selectedRole.permissions.map((permission) => permission.permissionKey)
    )
  } catch (error) {
    return legacyOrganizationJson(
      { error: error instanceof Error ? error.message : 'Permissão de delegação inválida.' },
      { status: 403 },
      '/api/v1/organizations/me/invitations/:id/resend'
    )
  }

  const nextExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const [inviterUser, organization, updatedInvitation] = await Promise.all([
    prisma.user.findUnique({
      where: { id: access.userId },
      select: { name: true, email: true },
    }),
    prisma.organization.findUnique({
      where: { id: access.teamId },
      select: { name: true },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        inviterId: access.userId,
        expiresAt: nextExpiration,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
      },
    }),
  ])

  const acceptUrl = `${APP_URL}/accept-invitation/${updatedInvitation.id}`

  try {
    const emailContent = await generateInvitationEmail({
      inviterName: inviterUser?.name || inviterUser?.email || 'Time Whatrack',
      organizationName: organization?.name || 'sua equipe',
      acceptUrl,
      expiresInDays: 7,
    })

    const sendResult = await resendProvider.send({
      to: updatedInvitation.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    if (!sendResult.success) {
      throw sendResult.error || new Error('Falha ao enviar o convite')
    }
  } catch (error) {
    console.error('[Invitations] Failed to resend invitation email:', error)
    return legacyOrganizationJson(
      { error: 'Não foi possível reenviar o convite no momento.' },
      { status: 502 },
      '/api/v1/organizations/me/invitations/:id/resend'
    )
  }

  void auditService.log({
    organizationId: access.teamId,
    userId: access.userId,
    action: 'invitation.resent',
    resourceType: 'invitation',
    resourceId: updatedInvitation.id,
    before: { expiresAt: invitation.expiresAt },
    after: {
      email: updatedInvitation.email,
      role: updatedInvitation.role,
      status: updatedInvitation.status,
      expiresAt: updatedInvitation.expiresAt,
    },
  })

  return legacyOrganizationJson(
    { success: true, invitation: updatedInvitation },
    { status: 200 },
    '/api/v1/organizations/me/invitations/:id/resend'
  )
}
