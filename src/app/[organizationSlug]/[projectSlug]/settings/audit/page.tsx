import { ScrollText } from 'lucide-react'

import { PageContent, PageHeader, PageShell } from '@/components/dashboard/layout'
import { AuditLogsTable } from '@/components/dashboard/settings/audit-logs-table'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export default async function AuditPage() {
  await requireWorkspacePageAccess({ permissions: 'view:audit' })

  return (
    <PageShell maxWidth="5xl">
      <PageHeader
        title="Auditoria"
        description="Acompanhe o histórico de ações críticas realizadas no workspace."
        icon={ScrollText}
      />
      <PageContent>
        <AuditLogsTable />
      </PageContent>
    </PageShell>
  )
}
