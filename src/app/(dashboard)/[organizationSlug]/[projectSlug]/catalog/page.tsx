import { CatalogPageContent } from '@/components/dashboard/catalog/catalog-page-content'
import { requireWorkspacePageAccess } from '@/server/auth/require-workspace-page-access'

type CatalogRoutePageProps = {
  params: Promise<{ organizationSlug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CatalogRoutePage({
  params,
  searchParams,
}: CatalogRoutePageProps) {
  const { organizationSlug } = await params
  await requireWorkspacePageAccess({ permissions: 'manage:items', organizationSlug })

  const rawSearchParams = (await searchParams) ?? {}
  const tab = Array.isArray(rawSearchParams.tab) ? rawSearchParams.tab[0] : rawSearchParams.tab
  const selectedTab = tab === 'categories' ? 'categories' : 'items'

  return <CatalogPageContent selectedTab={selectedTab} />
}
