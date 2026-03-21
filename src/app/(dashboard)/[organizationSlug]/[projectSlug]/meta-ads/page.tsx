import { MetaAdsPageContent } from '@/components/dashboard/meta-ads/meta-ads-page-content'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

type MetaAdsPageProps = {
  params: Promise<{ organizationSlug: string }>
}

export default async function MetaAdsPage({ params }: MetaAdsPageProps) {
  const { organizationSlug } = await params
  await requireWorkspacePageAccess({ permissions: 'view:meta', organizationSlug })
  return <MetaAdsPageContent />
}
