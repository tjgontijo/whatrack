import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { auditService } from '@/lib/audit.service'
import { prisma } from '@/lib/prisma'
import { legacyOrganizationJson } from '@/server/http/legacy-organization'
import { validatePermissionAccess } from '@/server/auth/validate-organization-access'
import { getOrganizationRoleByKey } from '@/server/organization/organization-rbac.service'
import { assertCanDelegatePermissions } from '@/server/organization/permission-delegation-policy'
import { resendProvider } from '@/services/mail/resend'
import { generateInvitationEmail } from '@/services/mail/templates/InvitationEmail'

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .default('user')
    .transform((value) => value.toLowerCase()),
})

export async function POST(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'manage:team_members')
  if (!access.hasAccess || !access.teamId || !access.userId || !access.role) {
    return legacyOrganizationJson(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 },
      '/api/v1/organizations/me/invitations'
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = createInvitationSchema.safeParse(body)
  if (!parsed.success) {
    return legacyOrganizationJson(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 },
      '/api/v1/organizations/me/invitations'
    )
  }

  if (access.role !== 'owner' && access.role !== 'admin') {
    return legacyOrganizationJson(
      { error: 'Apenas owner/admin podem gerenciar convites.' },
      { status: 403 },
      '/api/v1/organizations/me/invitations'
    )
  }

  const selectedRole = await getOrganizationRoleByKey(access.teamId, parsed.data.role)
  if (!selectedRole) {
    return legacyOrganizationJson(
      { error: 'Papel não encontrado para esta organização.' },
      { status: 404 },
      '/api/v1/organizations/me/invitations'
    )
  }

  if (access.role !== 'owner' && selectedRole.key === 'owner') {
    return legacyOrganizationJson(
      { error: 'Somente owner pode convidar membro com papel owner.' },
      { status: 403 },
      '/api/v1/organizations/me/invitations'
    )
  }

  if (access.role === 'admin' && !['user', 'admin'].includes(selectedRole.key)) {
    return legacyOrganizationJson(
      { error: 'Admin pode convidar apenas membros com papel user/admin.' },
      { status: 403 },
      '/api/v1/organizations/me/invitations'
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
      '/api/v1/organizations/me/invitations'
    )
  }

  const existingMember = await prisma.member.findFirst({
    where: {
      organizationId: access.teamId,
      user: {
        email: parsed.data.email,
      },
    },
    select: { id: true },
  })

  if (existingMember) {
    return legacyOrganizationJson(
      { error: 'Este usuário já pertence à equipe.' },
      { status: 409 },
      '/api/v1/organizations/me/invitations'
    )
  }

  const existingPendingInvitation = await prisma.invitation.findFirst({
    where: {
      organizationId: access.teamId,
      email: parsed.data.email,
      status: 'pending',
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })

  if (existingPendingInvitation) {
    return legacyOrganizationJson(
      { error: 'Já existe um convite pendente para este e-mail.' },
      { status: 409 },
      '/api/v1/organizations/me/invitations'
    )
  }

  const [invitation, organization] = await Promise.all([
    prisma.invitation.create({
      data: {
        email: parsed.data.email,
        role: selectedRole.key,
        status: 'pending',
        organizationId: access.teamId,
        inviterId: access.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    }),
    prisma.organization.findUnique({
      where: { id: access.teamId },
      select: { name: true },
    }),
  ])

  // Send invitation email (failure does not revert invitation creation)
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const acceptUrl = `${appUrl}/sign-in?invitationId=${invitation.id}`

  try {
    const inviterUser = await prisma.user.findUnique({
      where: { id: access.userId },
      select: { name: true, email: true },
    })

    const emailContent = await generateInvitationEmail({
      inviterName: inviterUser?.name || inviterUser?.email || 'Time Whatrack',
      organizationName: organization?.name || 'sua equipe',
      acceptUrl,
      expiresInDays: 7,
    })

    await resendProvider.send({
      to: parsed.data.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })
  } catch (emailError) {
    console.error('[Invitations] Failed to send invitation email:', emailError)
    // Intentionally not throwing — invitation persists even if email fails
  }

  void auditService.log({
    organizationId: access.teamId,
    userId: access.userId,
    action: 'invitation.created',
    resourceType: 'invitation',
    resourceId: invitation.id,
    after: { email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt },
  })

  return legacyOrganizationJson(invitation, { status: 201 }, '/api/v1/organizations/me/invitations')
}

export async function GET(req: NextRequest) {
  const access = await validatePermissionAccess(req, 'manage:team_members')
  if (!access.hasAccess || !access.teamId || !access.role) {
    return legacyOrganizationJson(
      { error: access.error ?? 'Acesso negado' },
      { status: 403 },
      '/api/v1/organizations/me/invitations'
    )
  }

  if (access.role !== 'owner' && access.role !== 'admin') {
    return legacyOrganizationJson(
      { error: 'Apenas owner/admin podem visualizar convites.' },
      { status: 403 },
      '/api/v1/organizations/me/invitations'
    )
  }

  const invitations = await prisma.invitation.findMany({
    where: {
      organizationId: access.teamId,
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

  return legacyOrganizationJson(
    { data: invitations },
    { status: 200 },
    '/api/v1/organizations/me/invitations'
  )
}
