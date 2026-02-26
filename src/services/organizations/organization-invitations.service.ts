import { prisma } from '@/lib/db/prisma'
import { requireEnv } from '@/lib/env/require-env'
import { auditService } from '@/services/audit/audit.service'
import { resendProvider } from '@/services/mail/resend'
import { generateInvitationEmail } from '@/services/mail/templates/InvitationEmail'
import { getOrganizationRoleByKey } from '@/server/organization/organization-rbac.service'
import { assertCanDelegatePermissions } from '@/server/organization/permission-delegation-policy'
import type { CreateOrganizationInvitationInput } from '@/schemas/organizations/organization-invitation-schemas'

const APP_URL = requireEnv('APP_URL')

type ServiceError = {
  error: string
  status: 403 | 404 | 409 | 502
}

function isAdminOrOwner(role: string) {
  return role === 'owner' || role === 'admin'
}

export async function createOrganizationInvitation(input: {
  organizationId: string
  actorUserId: string
  actorRole: string
  actorGlobalRole?: string
  data: CreateOrganizationInvitationInput
}): Promise<
  | {
      id: string
      email: string
      role: string | null
      status: string
      organizationId: string
      inviterId: string
      expiresAt: Date
    }
  | ServiceError
> {
  if (!isAdminOrOwner(input.actorRole)) {
    return { error: 'Apenas owner/admin podem gerenciar convites.', status: 403 }
  }

  const selectedRole = await getOrganizationRoleByKey(input.organizationId, input.data.role)
  if (!selectedRole) {
    return { error: 'Papel não encontrado para esta organização.', status: 404 }
  }

  if (input.actorRole !== 'owner' && selectedRole.key === 'owner') {
    return { error: 'Somente owner pode convidar membro com papel owner.', status: 403 }
  }

  if (input.actorRole === 'admin' && !['user', 'admin'].includes(selectedRole.key)) {
    return { error: 'Admin pode convidar apenas membros com papel user/admin.', status: 403 }
  }

  try {
    assertCanDelegatePermissions(
      input.actorGlobalRole,
      selectedRole.permissions.map((permission) => permission.permissionKey)
    )
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Permissão de delegação inválida.',
      status: 403,
    }
  }

  const existingMember = await prisma.member.findFirst({
    where: {
      organizationId: input.organizationId,
      user: { email: input.data.email },
    },
    select: { id: true },
  })

  if (existingMember) {
    return { error: 'Este usuário já pertence à equipe.', status: 409 }
  }

  const existingPendingInvitation = await prisma.invitation.findFirst({
    where: {
      organizationId: input.organizationId,
      email: input.data.email,
      status: 'pending',
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })

  if (existingPendingInvitation) {
    return { error: 'Já existe um convite pendente para este e-mail.', status: 409 }
  }

  const [invitation, organization] = await Promise.all([
    prisma.invitation.create({
      data: {
        email: input.data.email,
        role: selectedRole.key,
        status: 'pending',
        organizationId: input.organizationId,
        inviterId: input.actorUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { name: true },
    }),
  ])

  const acceptUrl = `${APP_URL}/accept-invitation/${invitation.id}`

  try {
    const inviterUser = await prisma.user.findUnique({
      where: { id: input.actorUserId },
      select: { name: true, email: true },
    })

    const emailContent = await generateInvitationEmail({
      inviterName: inviterUser?.name || inviterUser?.email || 'Time Whatrack',
      organizationName: organization?.name || 'sua equipe',
      acceptUrl,
      expiresInDays: 7,
    })

    await resendProvider.send({
      to: input.data.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })
  } catch (emailError) {
    console.error('[Invitations] Failed to send invitation email:', emailError)
  }

  void auditService.log({
    organizationId: input.organizationId,
    userId: input.actorUserId,
    action: 'invitation.created',
    resourceType: 'invitation',
    resourceId: invitation.id,
    after: { email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt },
  })

  return invitation
}

export async function listOrganizationPendingInvitations(input: {
  organizationId: string
  actorRole: string
}) {
  if (!isAdminOrOwner(input.actorRole)) {
    return { error: 'Apenas owner/admin podem visualizar convites.', status: 403 as const }
  }

  const invitations = await prisma.invitation.findMany({
    where: {
      organizationId: input.organizationId,
      status: 'pending',
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { expiresAt: 'asc' },
  })

  return { data: invitations }
}

export async function deleteOrganizationInvitation(input: {
  organizationId: string
  actorUserId: string
  actorRole: string
  invitationId: string
}) {
  if (!isAdminOrOwner(input.actorRole)) {
    return { error: 'Apenas owner/admin podem gerenciar convites.', status: 403 as const }
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: input.invitationId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      role: true,
      email: true,
      status: true,
    },
  })

  if (!invitation) {
    return { error: 'Convite não encontrado', status: 404 as const }
  }

  if (invitation.role === 'owner' && input.actorRole !== 'owner') {
    return { error: 'Somente owner pode remover convite de owner.', status: 403 as const }
  }

  if (input.actorRole === 'admin' && invitation.role && !['user', 'admin'].includes(invitation.role)) {
    return { error: 'Admin pode remover apenas convites de user/admin.', status: 403 as const }
  }

  await prisma.invitation.delete({
    where: { id: invitation.id },
  })

  void auditService.log({
    organizationId: input.organizationId,
    userId: input.actorUserId,
    action: 'invitation.deleted',
    resourceType: 'invitation',
    resourceId: invitation.id,
    before: {
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
    },
  })

  return { success: true }
}

export async function resendOrganizationInvitation(input: {
  organizationId: string
  actorUserId: string
  actorRole: string
  actorGlobalRole?: string
  invitationId: string
}) {
  if (!isAdminOrOwner(input.actorRole)) {
    return { error: 'Apenas owner/admin podem reenviar convites.', status: 403 as const }
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: input.invitationId,
      organizationId: input.organizationId,
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
    return { error: 'Convite pendente não encontrado.', status: 404 as const }
  }

  if (invitation.role === 'owner' && input.actorRole !== 'owner') {
    return { error: 'Somente owner pode reenviar convite de owner.', status: 403 as const }
  }

  if (input.actorRole === 'admin' && invitation.role && !['user', 'admin'].includes(invitation.role)) {
    return { error: 'Admin pode reenviar apenas convites de user/admin.', status: 403 as const }
  }

  const selectedRole = await getOrganizationRoleByKey(input.organizationId, invitation.role || 'user')
  if (!selectedRole) {
    return { error: 'Papel do convite não encontrado para esta organização.', status: 404 as const }
  }

  try {
    assertCanDelegatePermissions(
      input.actorGlobalRole,
      selectedRole.permissions.map((permission) => permission.permissionKey)
    )
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Permissão de delegação inválida.',
      status: 403 as const,
    }
  }

  const nextExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const [inviterUser, organization, updatedInvitation] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.actorUserId },
      select: { name: true, email: true },
    }),
    prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { name: true },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        inviterId: input.actorUserId,
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
    return { error: 'Não foi possível reenviar o convite no momento.', status: 502 as const }
  }

  void auditService.log({
    organizationId: input.organizationId,
    userId: input.actorUserId,
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

  return { success: true, invitation: updatedInvitation }
}

export async function getPublicInvitation(invitationId: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      organization: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!invitation || invitation.status !== 'pending' || invitation.expiresAt <= new Date()) {
    return { error: 'Invitation not found.', status: 404 as const }
  }

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role || 'user',
    expiresAt: invitation.expiresAt,
    organizationName: invitation.organization.name,
  }
}
