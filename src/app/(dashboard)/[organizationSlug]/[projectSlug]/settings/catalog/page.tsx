import { redirect } from 'next/navigation'

type CatalogPageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CatalogPage({ params, searchParams }: CatalogPageProps) {
  const { organizationSlug, projectSlug } = await params
  const rawSearchParams = (await searchParams) ?? {}
  const tab = Array.isArray(rawSearchParams.tab) ? rawSearchParams.tab[0] : rawSearchParams.tab
  const nextPath =
    tab === 'categories'
      ? `/${organizationSlug}/${projectSlug}/catalog?tab=categories`
      : `/${organizationSlug}/${projectSlug}/catalog`

  redirect(nextPath)
}
