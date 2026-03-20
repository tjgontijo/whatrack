import { IntegrationsHub } from '@/components/dashboard/integrations/integrations-hub'
import { SectionShell } from '@/components/dashboard/layout'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

type IntegrationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function normalizeTab(value: string | string[] | undefined): 'whatsapp' | 'meta-ads' {
  const tab = Array.isArray(value) ? value[0] : value
  return tab === 'meta-ads' ? 'meta-ads' : 'whatsapp'
}

export default async function IntegrationsPage({ searchParams }: IntegrationsPageProps) {
  const access = await requireWorkspacePageAccess({ permissions: 'manage:integrations' })
  const tab = normalizeTab((await searchParams)?.tab)

  return (
    <SectionShell>
      <IntegrationsHub organizationId={access.organizationId} initialTab={tab} />
    </SectionShell>
  )
}
