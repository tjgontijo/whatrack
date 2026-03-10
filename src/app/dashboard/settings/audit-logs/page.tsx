import { ScrollText } from 'lucide-react'
import { PageShell, PageHeader, PageContent } from '@/components/dashboard/layout'
import { AuditLogsTable } from '@/components/dashboard/settings/audit-logs-table'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export default async function AuditLogsPage() {
  await requireWorkspacePageAccess({ permissions: 'view:audit' })

  return (
    <PageShell>
      <PageHeader
        title="Logs de Auditoria"
        description="Acompanhe todas as ações realizadas na sua organização"
        icon={ScrollText}
      />

      <PageContent>
        <AuditLogsTable />
      </PageContent>
    </PageShell>
  )
}
