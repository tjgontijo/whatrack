import { redirect } from 'next/navigation'

type SettingsIndexPageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}

export default async function SettingsIndexPage({ params }: SettingsIndexPageProps) {
  const { organizationSlug, projectSlug } = await params
  redirect(`/${organizationSlug}/${projectSlug}/settings/profile`)
}
