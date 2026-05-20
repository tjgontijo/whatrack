import { HeaderPageShell } from '@/features/dashboard/components/layout'
import { MetaAdsSettingsContent } from '@/features/meta-ads/components/settings/meta-ads-settings-content'
import { resolveProjectContext } from '@/server/project/resolve-project-context'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'
import { notFound } from 'next/navigation'

type SettingsMetaAdsPageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}

export default async function SettingsMetaAdsPage({ params }: SettingsMetaAdsPageProps) {
  const { organizationSlug, projectSlug } = await params
  const access = await requireWorkspacePageAccess({
    permissions: 'manage:integrations',
    organizationSlug,
  })
  const context = await resolveProjectContext({
    organizationSlug,
    projectSlug,
    userId: access.userId,
  })

  if (!context) {
    notFound()
  }

  return (
    <HeaderPageShell title='Meta Ads'>
      <MetaAdsSettingsContent organizationId={access.organizationId} projectId={context.projectId} />
    </HeaderPageShell>
  )
}
