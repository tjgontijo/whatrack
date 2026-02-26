'use client'

import { ScrollText } from 'lucide-react'
import { PageShell, PageHeader, PageContent } from '@/components/dashboard/layout'
import { AuditLogsTable } from '@/components/dashboard/settings/audit-logs-table'

export default function AuditLogsPage() {
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
