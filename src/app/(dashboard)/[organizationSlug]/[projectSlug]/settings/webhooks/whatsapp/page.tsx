import { redirect } from 'next/navigation'

type WebhooksRedirectPageProps = {
  params: Promise<{ organizationSlug: string; projectSlug: string }>
}

export default async function WebhooksRedirectPage({ params }: WebhooksRedirectPageProps) {
  const { organizationSlug, projectSlug } = await params
  redirect(`/${organizationSlug}/${projectSlug}/settings/whatsapp`)
}
