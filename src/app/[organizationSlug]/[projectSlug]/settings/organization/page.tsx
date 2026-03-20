import { Building2 } from 'lucide-react'
import { PageShell, PageHeader, PageContent } from '@/components/dashboard/layout'
import { CompanyDataSection } from '@/components/dashboard/settings/company-data-section'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

export default async function OrganizationSettingsPage() {
  await requireWorkspacePageAccess({ permissions: 'manage:organization' })

  return (
    <PageShell maxWidth="3xl">
      <PageHeader
        title="Organização"
        description="Gerencie os dados da sua empresa e configurações fiscais"
        icon={Building2}
      />

      <PageContent>
        <CompanyDataSection />
      </PageContent>
    </PageShell>
  )
}
