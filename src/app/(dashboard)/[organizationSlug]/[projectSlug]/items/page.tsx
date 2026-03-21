import { redirect } from 'next/navigation'

type ItemsPageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}

export default async function ItemsPage({ params }: ItemsPageProps) {
  const { organizationSlug, projectSlug } = await params
  redirect(`/${organizationSlug}/${projectSlug}/catalog`)
}
