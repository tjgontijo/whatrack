import { TeamSettingsShell } from '@/components/dashboard/account/team-settings-shell'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'
import { listOrganizationMembers } from '@/services/organizations/organization-members.service'
import { listOrganizationPendingInvitations } from '@/services/organizations/organization-invitations.service'
import { listOrganizationRolesWithCatalog } from '@/services/organizations/organization-roles.service'

type TeamPageProps = {
  params: Promise<{ organizationSlug: string }>
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { organizationSlug } = await params
  const access = await requireWorkspacePageAccess({
    permissions: 'manage:members',
    organizationSlug,
  })

  const [membersResult, invitationsResult, rolesResult] = await Promise.all([
    listOrganizationMembers({ organizationId: access.organizationId, role: access.role }),
    listOrganizationPendingInvitations({ organizationId: access.organizationId, actorRole: access.role }),
    listOrganizationRolesWithCatalog({ organizationId: access.organizationId, globalRole: access.globalRole }),
  ])

  const initialMembers = 'data' in membersResult ? membersResult.data : []
  const rawInvitations = 'data' in invitationsResult ? (invitationsResult.data ?? []) : []
  const initialInvitations = rawInvitations.map((inv) => ({
    ...inv,
    expiresAt: inv.expiresAt.toISOString(),
  }))
  const initialRoles = rolesResult.data
  const initialPermissionCatalog = rolesResult.permissionCatalog

  return (
    <TeamSettingsShell
      organizationId={access.organizationId}
      initialMembers={initialMembers}
      initialInvitations={initialInvitations}
      initialRoles={initialRoles}
      initialPermissionCatalog={initialPermissionCatalog}
    />
  )
}
