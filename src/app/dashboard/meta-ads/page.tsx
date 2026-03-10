import { MetaAdsPageContent } from '@/components/dashboard/meta-ads/meta-ads-page-content'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

type MetaAdsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function MetaAdsPage({ searchParams }: MetaAdsPageProps) {
  await requireWorkspacePageAccess({ permissions: 'view:meta' })

  const rawSearchParams = (await searchParams) ?? {}
  const tab = Array.isArray(rawSearchParams.tab) ? rawSearchParams.tab[0] : rawSearchParams.tab

  return <MetaAdsPageContent initialTab={tab ?? 'overview'} />
}
