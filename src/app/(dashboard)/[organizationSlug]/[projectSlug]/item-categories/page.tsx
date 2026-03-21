import { redirect } from 'next/navigation'

type ItemCategoriesPageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}

export default async function ItemCategoriesPage({ params }: ItemCategoriesPageProps) {
  const { organizationSlug, projectSlug } = await params
  redirect(`/${organizationSlug}/${projectSlug}/catalog?tab=categories`)
}
