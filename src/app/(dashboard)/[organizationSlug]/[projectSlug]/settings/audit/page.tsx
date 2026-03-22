import { HeaderPageShell, RefreshButton } from '@/components/dashboard/layout'
import { AuditLogsTable } from '@/components/dashboard/settings/audit-logs-table'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'
import { listOrganizationAuditResourceTypes } from '@/services/organizations/organization-audit.service'

type AuditPageProps = {
  params: Promise<{ organizationSlug: string }>
}

export default async function AuditPage({ params }: AuditPageProps) {
  const { organizationSlug } = await params
  const access = await requireWorkspacePageAccess({
    permissions: 'view:audit',
    organizationSlug,
  })

  const { resourceTypes: initialResourceTypes } = await listOrganizationAuditResourceTypes(
    access.organizationId,
  )

  return (
    <HeaderPageShell
      title="Auditoria"
      refreshAction={<RefreshButton queryKey={['audit-logs', access.organizationId]} />}
    >
      <AuditLogsTable initialResourceTypes={initialResourceTypes} />
    </HeaderPageShell>
  )
}
